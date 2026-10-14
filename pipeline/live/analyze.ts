/**
 * For each fixture on a date: fit the pooled model, build the match packet,
 * call Claude, and store the analysis. Idempotent per fixture per day.
 */
import crypto from "node:crypto";
import { and, gte, lt } from "drizzle-orm";
import { db, schema } from "./db";
import { latestOdds, loadFinishedHistory, type IngestResult } from "./ingest";
import { latestAnalyses } from "./latest";
import type { ProviderStanding } from "../providers/types";
import type { LeagueCode, Match } from "../data/football-data";
import { recentForm } from "../data/form";
import { fit, predict, type Model, type Prediction } from "../model/dixon-coles";
import { blendPrediction } from "../model/blend";
import { implied1x2, impliedOU } from "../model/odds";
import { analyzeMatch } from "../analysis/claude";
import type { MatchPacket } from "../analysis/prompt";

export const MARKET_BLEND = Number(process.env.MARKET_BLEND ?? "0.8");
export const DECAY_XI = Number(process.env.DECAY_XI ?? "0.002");

type FixtureRow = typeof schema.fixtures.$inferSelect;

export function toMatches(rows: FixtureRow[]): Match[] {
  return rows
    .filter((r) => r.homeGoals !== null && r.awayGoals !== null)
    .map((r) => ({
      league: r.leagueCode as LeagueCode,
      season: r.season,
      date: r.kickoffAt,
      home: r.home,
      away: r.away,
      hg: r.homeGoals!,
      ag: r.awayGoals!,
      result: r.homeGoals! > r.awayGoals! ? "H" : r.homeGoals! < r.awayGoals! ? "A" : "D",
      odds: { open: null, close: null, avg: null, max: null, ou25: null, ou25Close: null },
    }));
}

function formString(history: Match[], team: string, before: Date, n = 5, venue: "home" | "away" | "all" = "all"): string {
  const out: string[] = [];
  for (let i = history.length - 1; i >= 0 && out.length < n; i--) {
    const m = history[i];
    if (m.date >= before) continue;
    if (m.home === team && venue !== "away") out.push(m.hg > m.ag ? "W" : m.hg === m.ag ? "D" : "L");
    else if (m.away === team && venue !== "home") out.push(m.ag > m.hg ? "W" : m.hg === m.ag ? "D" : "L");
  }
  return out.reverse().join("") || "-";
}

function restDays(history: Match[], team: string, before: Date): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.date >= before) continue;
    if (m.home === team || m.away === team) return Math.round((before.getTime() - m.date.getTime()) / 86_400_000);
  }
  return null;
}

function headToHead(history: Match[], a: string, b: string, before: Date, n = 5) {
  const out: MatchPacket["headToHead"] = [];
  for (let i = history.length - 1; i >= 0 && out.length < n; i--) {
    const m = history[i];
    if (m.date >= before) continue;
    if ((m.home === a && m.away === b) || (m.home === b && m.away === a)) {
      out.push({ date: m.date.toISOString().slice(0, 10), home: m.home, away: m.away, score: `${m.hg}-${m.ag}` });
    }
  }
  return out;
}

function standingFor(rows: Map<string, ProviderStanding> | undefined, team: string) {
  const r = rows?.get(team);
  return r ? { rank: r.rank, points: r.points, played: r.played } : null;
}

export async function fixturesOn(date: string): Promise<FixtureRow[]> {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start.getTime() + 86_400_000);
  return db
    .select()
    .from(schema.fixtures)
    .where(and(gte(schema.fixtures.kickoffAt, start), lt(schema.fixtures.kickoffAt, end)))
    .orderBy(schema.fixtures.kickoffAt);
}

export async function buildPacket(f: FixtureRow, model: Model, history: Match[], standings: IngestResult["standings"]) {
  const rawPred: Prediction = predict(model, f.home, f.away);
  const snap = await latestOdds(f.id);
  const n = (v: string | null | undefined) => (v === null || v === undefined ? null : Number(v));
  const odds = {
    h: n(snap?.h), d: n(snap?.d), a: n(snap?.a),
    over25: n(snap?.over25), under25: n(snap?.under25),
    bttsYes: n(snap?.bttsYes), bttsNo: n(snap?.bttsNo),
    bookmaker: snap ? `${snap.bookmaker ?? snap.provider} via ${snap.provider}` : null,
  };
  const odds1x2 = odds.h && odds.d && odds.a ? { h: odds.h, d: odds.d, a: odds.a } : null;
  const oddsOU = odds.over25 && odds.under25 ? { over: odds.over25, under: odds.under25 } : null;
  const oddsBtts = odds.bttsYes && odds.bttsNo ? { yes: odds.bttsYes, no: odds.bttsNo } : null;
  const blended = blendPrediction(rawPred, odds1x2, oddsOU, MARKET_BLEND, oddsBtts);
  // Injuries need a paid feed (API-Football Pro); the packet states that they are unavailable.
  const injuries: { team: { name: string }; player: { name: string; reason: string; type: string } }[] = [];
  const ko = f.kickoffAt;

  const homeForm = recentForm(history, f.home, ko, 5);
  const awayForm = recentForm(history, f.away, ko, 5);
  const homeHomeForm = recentForm(history, f.home, ko, 5, "home");
  const awayAwayForm = recentForm(history, f.away, ko, 5, "away");
  const imp1 = odds1x2 ? implied1x2(odds1x2) : null;
  const impOU = oddsOU ? impliedOU(oddsOU) : null;

  const packet: MatchPacket = {
    competition: f.leagueName,
    round: f.round,
    kickoffUtc: ko.toISOString(),
    home: f.home,
    away: f.away,
    model: {
      raw: {
        pH: r4(rawPred.pH), pD: r4(rawPred.pD), pA: r4(rawPred.pA),
        pOver25: r4(rawPred.pOver25), pBtts: r4(rawPred.pBtts),
        xgHome: r4(rawPred.lambda), xgAway: r4(rawPred.mu),
      },
      blended: { pH: r4(blended.pH), pD: r4(blended.pD), pA: r4(blended.pA), pOver25: r4(blended.pOver25), pBtts: r4(blended.pBtts) },
      evidence: { homeMatches: Math.round(rawPred.homeWeight), awayMatches: Math.round(rawPred.awayWeight) },
    },
    odds,
    implied: imp1 ? { h: r4(imp1.h), d: r4(imp1.d), a: r4(imp1.a), over25: impOU ? r4(impOU.over) : null } : null,
    form: {
      home: { last5: formString(history, f.home, ko), ppg: r2(homeForm.ppg), gf: homeForm.goalsFor, ga: homeForm.goalsAgainst, homeLast5: formString(history, f.home, ko, 5, "home"), homePpg: r2(homeHomeForm.ppg) },
      away: { last5: formString(history, f.away, ko), ppg: r2(awayForm.ppg), gf: awayForm.goalsFor, ga: awayForm.goalsAgainst, awayLast5: formString(history, f.away, ko, 5, "away"), awayPpg: r2(awayAwayForm.ppg) },
    },
    standings: {
      home: standingFor(standings.get(f.leagueCode as never), f.home),
      away: standingFor(standings.get(f.leagueCode as never), f.away),
    },
    injuries: injuries.map((i) => ({ team: i.team.name, player: i.player.name, reason: i.player.reason, type: i.player.type })),
    injuryFeedAvailable: false,
    restDays: { home: restDays(history, f.home, ko), away: restDays(history, f.away, ko) },
    headToHead: headToHead(history, f.home, f.away, ko),
  };

  const features = {
    packet,
    odds1x2,
    oddsOU,
    oddsBtts,
    forms: { homeForm, awayForm, homeHomeForm, awayAwayForm },
    blend: MARKET_BLEND,
    xi: DECAY_XI,
  };
  return { packet, rawPred, blended, features };
}

function r4(x: number) {
  return Math.round(x * 10000) / 10000;
}
function r2(x: number) {
  return Math.round(x * 100) / 100;
}

export interface AnalyzeOptions {
  skipClaude?: boolean;
  refresh?: boolean;
  /** Analyse at most this many fixtures (cost control / testing). */
  limit?: number;
  /** Also analyse finished fixtures (testing against past dates on the free API plan). */
  allowFinished?: boolean;
}

export async function analyzeDate(date: string, standings: IngestResult["standings"], opts: AnalyzeOptions = {}) {
  const fixtures = await fixturesOn(date);
  if (fixtures.length === 0) {
    console.log(`analyze ${date}: no fixtures`);
    return [];
  }
  const historyRows = await loadFinishedHistory();
  const history = toMatches(historyRows);
  const asOf = new Date(`${date}T00:00:00Z`);
  const model = fit(history, { asOf, xi: DECAY_XI });
  console.log(`analyze ${date}: model fit on ${history.length} matches, home adv ${model.home.toFixed(3)}, rho ${model.rho}`);

  const existingByFixture = await latestAnalyses(fixtures.map((f) => f.id));
  const results = [];
  for (const f of fixtures) {
    if (opts.limit !== undefined && results.length >= opts.limit) break;
    if (f.status !== "scheduled" && !opts.allowFinished) continue;
    // An analysis without a Claude result (transient API failure) is retried on the next run.
    const existing = existingByFixture.get(f.id);
    if (!opts.refresh && existing && (existing.llmOutput || opts.skipClaude)) {
      console.log(`  ${f.home} vs ${f.away}: analysis exists, skipping`);
      continue;
    }

    const { packet, rawPred, blended, features } = await buildPacket(f, model, history, standings);
    let llm: Awaited<ReturnType<typeof analyzeMatch>> | null = null;
    if (!opts.skipClaude) {
      try {
        llm = await analyzeMatch(packet);
      } catch (err) {
        console.warn(`  ${f.home} vs ${f.away}: Claude failed: ${(err as Error).message}`);
      }
    }
    const id = crypto.randomUUID();
    await db.insert(schema.matchAnalyses).values({
      id,
      fixtureId: f.id,
      features,
      modelProbs: { raw: rawPred, blended },
      oddsSnapshot: packet.odds,
      llmOutput: llm?.analysis ?? null,
      llmModel: llm ? llm.servedBy : null,
      llmUsage: llm?.usage ?? null,
      runAt: new Date(),
    });
    console.log(
      `  ${f.home} vs ${f.away}: H ${blended.pH.toFixed(2)} D ${blended.pD.toFixed(2)} A ${blended.pA.toFixed(2)}${llm ? ` | claude H ${llm.analysis.probs1x2.home.toFixed(2)} conf ${llm.analysis.confidence}` : " | no LLM"}`,
    );
    results.push({ fixture: f, analysisId: id });
  }
  return results;
}

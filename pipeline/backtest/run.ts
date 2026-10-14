/**
 * Walk-forward backtest.
 *
 * For every matchday in the target season the model is refitted using only
 * matches played before that day (previous seasons included, decay-weighted),
 * predictions are made for that day's fixtures, each room applies its filter,
 * and tips are settled at the chosen bookmaker odds. Nothing from the future
 * leaks into a pick.
 *
 * Usage: pnpm backtest [--season 2526] [--odds open|close|max] [--leagues E0,SP1] [--xi 0.002]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { LEAGUE_CODES, loadSeasons, seasonRange, type LeagueCode, type Match } from "../data/football-data";
import { recentForm } from "../data/form";
import { fit, predict, type Prediction } from "../model/dixon-coles";
import { implied1x2 } from "../model/odds";
import { blendPrediction } from "../model/blend";
import { ROOMS, type Candidate, type MatchContext } from "../rooms/config";
import { profitUnits, settle, type Outcome } from "../rooms/settle";

const { values } = parseArgs({
  options: {
    season: { type: "string", default: "2526" },
    odds: { type: "string", default: "open" },
    leagues: { type: "string", default: LEAGUE_CODES.join(",") },
    xi: { type: "string", default: "0.002" },
    history: { type: "string", default: "2" }, // prior seasons to include
    blend: { type: "string", default: "0.8" }, // weight on market probabilities
    out: { type: "string" },
  },
});

type OddsSource = "open" | "close" | "max";

export interface TipRecord {
  room: string;
  league: LeagueCode;
  date: string;
  home: string;
  away: string;
  market: Candidate["market"];
  selection: Candidate["selection"];
  odds: number;
  modelProb: number;
  impliedProb: number;
  edge: number;
  outcome: Outcome;
  profit: number;
}

export interface RoomStats {
  room: string;
  tips: number;
  wins: number;
  winRate: number;
  profit: number;
  roi: number;
  avgOdds: number;
  maxDrawdown: number;
  longestLosingStreak: number;
  byMonth: Record<string, { tips: number; profit: number }>;
}

function pickOdds(m: Match, src: OddsSource) {
  const o = src === "close" ? m.odds.close : src === "max" ? m.odds.max : m.odds.open;
  const ou = src === "close" ? m.odds.ou25Close : m.odds.ou25;
  return { odds1x2: o, oddsOU: ou };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function runBacktest(params: {
  season: string;
  leagues: LeagueCode[];
  oddsSource: OddsSource;
  xi: number;
  historySeasons: number;
  blend: number;
}) {
  const firstSeason = seasonRange(
    String(Number(params.season.slice(0, 2)) - params.historySeasons).padStart(2, "0") +
      String(Number(params.season.slice(0, 2)) - params.historySeasons + 1).padStart(2, "0"),
    params.season,
  );
  const all = loadSeasons(params.leagues, firstSeason);
  const target = all.filter((m) => m.season === params.season);
  if (target.length === 0) throw new Error(`No matches for season ${params.season}`);

  const tips: TipRecord[] = [];
  // Model-quality metrics vs. the market on the full target season.
  let modelLogLoss = 0;
  let marketLogLoss = 0;
  let scored = 0;

  // Group target matches by league and day; refit per league per day.
  const days = new Map<string, Match[]>();
  for (const m of target) {
    const k = `${m.league}|${dayKey(m.date)}`;
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(m);
  }

  const byLeague = new Map<LeagueCode, Match[]>();
  for (const m of all) {
    if (!byLeague.has(m.league)) byLeague.set(m.league, []);
    byLeague.get(m.league)!.push(m);
  }

  for (const [key, fixtures] of days) {
    const [league, day] = key.split("|") as [LeagueCode, string];
    const asOf = new Date(day);
    const history = byLeague.get(league)!;
    const model = fit(history, { asOf, xi: params.xi });

    const roomCands = new Map<string, { m: Match; c: Candidate }[]>();
    for (const m of fixtures) {
      const rawPred: Prediction = predict(model, m.home, m.away);
      const { odds1x2, oddsOU } = pickOdds(m, params.oddsSource);
      const pred = blendPrediction(rawPred, odds1x2, oddsOU, params.blend);

      if (odds1x2) {
        const imp = implied1x2(odds1x2);
        const pm = m.result === "H" ? rawPred.pH : m.result === "D" ? rawPred.pD : rawPred.pA;
        const pk = m.result === "H" ? imp.h : m.result === "D" ? imp.d : imp.a;
        modelLogLoss += -Math.log(Math.max(pm, 1e-9));
        marketLogLoss += -Math.log(Math.max(pk, 1e-9));
        scored++;
      }

      const ctx: MatchContext = {
        match: m,
        pred,
        rawPred,
        odds1x2,
        oddsOU,
        oddsBtts: null,
        homeHomeForm: recentForm(history, m.home, m.date, 5, "home"),
        awayAwayForm: recentForm(history, m.away, m.date, 5, "away"),
        homeForm: recentForm(history, m.home, m.date, 5),
        awayForm: recentForm(history, m.away, m.date, 5),
      };
      for (const room of ROOMS) {
        if (rawPred.homeWeight < room.minEvidence || pred.awayWeight < room.minEvidence) continue;
        const c = room.select(ctx);
        if (!c) continue;
        if (!roomCands.has(room.slug)) roomCands.set(room.slug, []);
        roomCands.get(room.slug)!.push({ m, c });
      }
    }

    for (const room of ROOMS) {
      const cands = (roomCands.get(room.slug) ?? []).sort((x, y) => y.c.score - x.c.score).slice(0, room.maxTipsPerDay);
      for (const { m, c } of cands) {
        const outcome = settle(c, m.hg, m.ag);
        tips.push({
          room: room.slug,
          league,
          date: day,
          home: m.home,
          away: m.away,
          market: c.market,
          selection: c.selection,
          odds: c.odds,
          modelProb: c.modelProb,
          impliedProb: c.impliedProb,
          edge: c.edge,
          outcome,
          profit: profitUnits(outcome, c.odds),
        });
      }
    }
  }

  tips.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  const stats = ROOMS.map((r) => roomStats(r.slug, tips.filter((t) => t.room === r.slug)));
  return {
    params,
    matches: target.length,
    model: {
      logLoss: modelLogLoss / scored,
      marketLogLoss: marketLogLoss / scored,
      scored,
    },
    stats,
    tips,
  };
}

function roomStats(room: string, tips: TipRecord[]): RoomStats {
  let wins = 0;
  let profit = 0;
  let oddsSum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let streak = 0;
  let longest = 0;
  const byMonth: RoomStats["byMonth"] = {};
  for (const t of tips) {
    if (t.outcome === "win") {
      wins++;
      streak = 0;
    } else if (t.outcome === "loss") {
      streak++;
      longest = Math.max(longest, streak);
    }
    profit += t.profit;
    oddsSum += t.odds;
    peak = Math.max(peak, profit);
    maxDrawdown = Math.max(maxDrawdown, peak - profit);
    const mo = t.date.slice(0, 7);
    byMonth[mo] ??= { tips: 0, profit: 0 };
    byMonth[mo].tips++;
    byMonth[mo].profit += t.profit;
  }
  const n = tips.length;
  return {
    room,
    tips: n,
    wins,
    winRate: n ? wins / n : 0,
    profit,
    roi: n ? profit / n : 0,
    avgOdds: n ? oddsSum / n : 0,
    maxDrawdown,
    longestLosingStreak: longest,
    byMonth,
  };
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function renderReport(r: ReturnType<typeof runBacktest>): string {
  const lines: string[] = [];
  lines.push(`# Backtest ${r.params.season} (${r.params.leagues.join(", ")})`);
  lines.push("");
  lines.push(`**Label: BACKTEST.** Simulated picks on historical data, settled at Bet365 ${r.params.oddsSource} odds, flat 1-unit stakes. Not live results.`);
  lines.push("");
  lines.push(`Matches: ${r.matches}. Decay xi=${r.params.xi}. Market blend w=${r.params.blend}. History: ${r.params.historySeasons} prior seasons.`);
  lines.push("");
  lines.push(`Model 1X2 log-loss: ${r.model.logLoss.toFixed(4)} vs market ${r.model.marketLogLoss.toFixed(4)} (lower is better; the market is a strong baseline).`);
  lines.push("");
  lines.push("| Room | Tips | Win rate | Profit (u) | ROI | Avg odds | Max DD | Longest L streak |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const s of [...r.stats].sort((x, y) => y.roi - x.roi)) {
    lines.push(
      `| ${s.room} | ${s.tips} | ${pct(s.winRate)} | ${s.profit.toFixed(1)} | ${pct(s.roi)} | ${s.avgOdds.toFixed(2)} | ${s.maxDrawdown.toFixed(1)} | ${s.longestLosingStreak} |`,
    );
  }
  lines.push("");
  lines.push("## By month (profit in units)");
  lines.push("");
  const months = Array.from(new Set(r.tips.map((t) => t.date.slice(0, 7)))).sort();
  lines.push(`| Room | ${months.join(" | ")} |`);
  lines.push(`|---|${months.map(() => "---:").join("|")}|`);
  for (const s of r.stats) {
    lines.push(`| ${s.room} | ${months.map((m) => (s.byMonth[m] ? s.byMonth[m].profit.toFixed(1) : "-")).join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

if (process.argv[1] && process.argv[1].endsWith("run.ts")) {
  const result = runBacktest({
    season: values.season!,
    leagues: values.leagues!.split(",") as LeagueCode[],
    oddsSource: values.odds as OddsSource,
    xi: Number(values.xi),
    historySeasons: Number(values.history),
    blend: Number(values.blend),
  });
  const report = renderReport(result);
  process.stdout.write(report);
  const outDir = path.resolve(process.cwd(), "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const base = values.out ?? `backtest-${values.season}-${values.odds}-w${values.blend}`;
  fs.writeFileSync(path.join(outDir, `${base}.md`), report);
  fs.writeFileSync(path.join(outDir, `${base}.json`), JSON.stringify({ ...result, tips: result.tips }, null, 2));
  console.log(`\nSaved reports/${base}.md and .json`);
}

/**
 * ESPN's public (undocumented) scoreboard. No key. One request per competition per day
 * returns fixtures, live/final scores and DraftKings pre-match odds (moneyline for
 * home/draw/away and the 2.5 total). Unofficial, so it is used as a fallback that can
 * disappear without notice; everything it returns is cross-checked by canonical team names.
 */
import { fetchJson } from "./http";
import type { Provider, ProviderFixture, ProviderOdds, FixtureStatus } from "./types";
import type { CompetitionCode } from "../data/api-football";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SLUGS: Record<CompetitionCode, string> = {
  E0: "eng.1",
  SP1: "esp.1",
  I1: "ita.1",
  D1: "ger.1",
  F1: "fra.1",
  UCL: "uefa.champions",
};

interface EspnEvent {
  id: string;
  date: string;
  season?: { year: number };
  status: { type: { name: string; state: string; completed: boolean } };
  competitions: {
    id: string;
    competitors: { homeAway: "home" | "away"; score?: string; team: { displayName: string; shortDisplayName?: string; name?: string } }[];
    odds?: EspnOdds[];
  }[];
}

interface EspnOdds {
  provider?: { name: string };
  overUnder?: number;
  moneyline?: {
    home?: { open?: { odds?: string }; close?: { odds?: string } };
    away?: { open?: { odds?: string }; close?: { odds?: string } };
  };
  drawOdds?: { moneyLine?: number };
  total?: { over?: { close?: { line?: string; odds?: string }; open?: { line?: string; odds?: string } }; under?: { close?: { line?: string; odds?: string }; open?: { line?: string; odds?: string } } };
}

export function americanToDecimal(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace("+", "")) : v;
  if (!Number.isFinite(n) || n === 0) return null;
  const dec = n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
  return Math.round(dec * 1000) / 1000;
}

function mapStatus(s: EspnEvent["status"]["type"]): FixtureStatus {
  if (s.completed || s.name === "STATUS_FULL_TIME" || s.name === "STATUS_FINAL") return "finished";
  if (s.state === "in") return "live";
  if (s.name === "STATUS_POSTPONED") return "postponed";
  if (s.name === "STATUS_CANCELED") return "cancelled";
  return "scheduled";
}

function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= new Date(`${to}T00:00:00Z`).getTime(); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** One scoreboard fetch per competition-day per process: fixtures and odds share responses. */
const memo = new Map<string, Promise<EspnEvent[]>>();

async function scoreboard(competition: CompetitionCode, day: string): Promise<EspnEvent[]> {
  const k = `${competition}:${day}`;
  if (!memo.has(k)) memo.set(k, fetchScoreboard(competition, day));
  return memo.get(k)!;
}

async function fetchScoreboard(competition: CompetitionCode, day: string): Promise<EspnEvent[]> {
  const yyyymmdd = day.replace(/-/g, "");
  const data = await fetchJson<{ events?: EspnEvent[] }>({
    provider: "espn",
    url: `${BASE}/${SLUGS[competition]}/scoreboard?dates=${yyyymmdd}`,
    minIntervalMs: 1_000,
    cache: false,
    mockKey: `scoreboard_${SLUGS[competition]}_${yyyymmdd}.json`,
  });
  return data.events ?? [];
}

function teams(ev: EspnEvent) {
  const c = ev.competitions[0];
  const home = c.competitors.find((x) => x.homeAway === "home");
  const away = c.competitors.find((x) => x.homeAway === "away");
  return { c, home, away };
}

export const espn: Provider = {
  name: "espn",
  competitions: ["E0", "SP1", "I1", "D1", "F1", "UCL"],
  budget: { perDay: 400, perMinute: 60, creditsPerMonth: null },
  available: () => process.env.ESPN_DISABLED !== "1",

  async fixtures(competition, season, range) {
    if (!range) throw new Error("espn.fixtures needs a date range (one request per day)");
    const out: ProviderFixture[] = [];
    for (const day of days(range.from, range.to)) {
      for (const ev of await scoreboard(competition, day)) {
        const { home, away } = teams(ev);
        if (!home || !away) continue;
        const status = mapStatus(ev.status.type);
        out.push({
          provider: "espn",
          externalId: ev.id,
          competition,
          season,
          kickoffUtc: new Date(ev.date),
          homeRaw: home.team.displayName,
          awayRaw: away.team.displayName,
          status,
          homeGoals: status === "finished" || status === "live" ? Number(home.score ?? NaN) || 0 : null,
          awayGoals: status === "finished" || status === "live" ? Number(away.score ?? NaN) || 0 : null,
          round: null,
        });
      }
    }
    return out;
  },

  async odds(competition) {
    // Upcoming matches: today and the next two days.
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 2 * 86_400_000).toISOString().slice(0, 10);
    const out: ProviderOdds[] = [];
    for (const day of days(from, to)) {
      for (const ev of await scoreboard(competition, day)) {
        const { c, home, away } = teams(ev);
        if (!home || !away || !c.odds?.length) continue;
        const o = c.odds[0];
        // DraftKings moneylines: prefer the latest ("close") quote, fall back to the opener.
        const h = americanToDecimal(o.moneyline?.home?.close?.odds ?? o.moneyline?.home?.open?.odds);
        const a = americanToDecimal(o.moneyline?.away?.close?.odds ?? o.moneyline?.away?.open?.odds);
        const d = americanToDecimal(o.drawOdds?.moneyLine);
        const overQuote = o.total?.over?.close ?? o.total?.over?.open;
        const underQuote = o.total?.under?.close ?? o.total?.under?.open;
        const is25 = (overQuote?.line ?? "").includes("2.5") || o.overUnder === 2.5;
        out.push({
          provider: "espn",
          externalId: ev.id,
          competition,
          kickoffUtc: new Date(ev.date),
          homeRaw: home.team.displayName,
          awayRaw: away.team.displayName,
          bookmaker: o.provider?.name ?? "ESPN",
          h,
          d,
          a,
          over25: is25 ? americanToDecimal(overQuote?.odds) : null,
          under25: is25 ? americanToDecimal(underQuote?.odds) : null,
          bttsYes: null,
          bttsNo: null,
        });
      }
    }
    return out;
  },
};

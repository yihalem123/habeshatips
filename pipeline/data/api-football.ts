/**
 * Minimal API-Football (api-sports.io v3) client with a disk cache.
 *
 * - Key from API_FOOTBALL_KEY. Set API_FOOTBALL_MOCK=1 to serve canned responses
 *   from pipeline/__fixtures__/api-football/ (used by tests and dry runs).
 * - Every successful response is cached under data/cache/api-football/ keyed by
 *   the request path, so re-running a day's pipeline costs zero requests.
 * - Rate-limit headers are tracked so the daily budget can be reported.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AF_BASE = "https://v3.football.api-sports.io";
export const CACHE_DIR = path.resolve(process.cwd(), "data/cache/api-football");
export const MOCK_DIR = path.resolve(process.cwd(), "pipeline/__fixtures__/api-football");

/** Competitions we cover, keyed by our league code. */
export const COMPETITIONS = {
  E0: { id: 39, name: "Premier League", country: "England" },
  SP1: { id: 140, name: "La Liga", country: "Spain" },
  I1: { id: 135, name: "Serie A", country: "Italy" },
  D1: { id: 78, name: "Bundesliga", country: "Germany" },
  F1: { id: 61, name: "Ligue 1", country: "France" },
  UCL: { id: 2, name: "UEFA Champions League", country: "World" },
} as const;
export type CompetitionCode = keyof typeof COMPETITIONS;
export const COMPETITION_CODES = Object.keys(COMPETITIONS) as CompetitionCode[];
export const COMPETITION_BY_ID = new Map<number, CompetitionCode>(
  COMPETITION_CODES.map((c) => [COMPETITIONS[c].id, c]),
);

/** Bet365 bookmaker id in API-Football. */
export const BOOKMAKER_BET365 = 8;

export interface AfFixture {
  fixture: {
    id: number;
    date: string; // ISO
    timestamp: number;
    status: { short: string; long: string; elapsed: number | null };
    venue?: { name: string | null; city: string | null };
  };
  league: { id: number; name: string; country: string; season: number; round: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
}

export interface AfOddsValue {
  value: string;
  odd: string;
}
export interface AfOddsBet {
  id: number;
  name: string;
  values: AfOddsValue[];
}
export interface AfOdds {
  fixture: { id: number };
  bookmakers: { id: number; name: string; bets: AfOddsBet[] }[];
}

export interface AfInjury {
  player: { id: number; name: string; type: string; reason: string };
  team: { id: number; name: string };
  fixture: { id: number; date: string };
}

export interface AfStandingRow {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  form: string | null;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export interface AfResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | unknown[];
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

export interface RateInfo {
  dayLimit: number | null;
  dayRemaining: number | null;
  minuteLimit: number | null;
  minuteRemaining: number | null;
}

export const lastRate: RateInfo = { dayLimit: null, dayRemaining: null, minuteLimit: null, minuteRemaining: null };

/** Requests per minute allowed by the plan (free: 10, Pro: 300). Requests are spaced to fit. */
const RPM = Number(process.env.API_FOOTBALL_RPM ?? "10");
const MIN_INTERVAL_MS = Math.ceil(60_000 / RPM);
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

function cacheKey(pathname: string, params: Record<string, string | number>): string {
  const qs = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const raw = `${pathname}?${qs}`;
  return `${pathname.replace(/\//g, "_")}_${crypto.createHash("sha1").update(raw).digest("hex").slice(0, 12)}.json`;
}

export interface GetOptions {
  /** Bypass the cache (e.g. refreshing live scores). */
  noCache?: boolean;
}

export async function afGet<T>(pathname: string, params: Record<string, string | number>, opts: GetOptions = {}): Promise<AfResponse<T>> {
  if (process.env.API_FOOTBALL_MOCK === "1") {
    const file = path.join(MOCK_DIR, cacheKey(pathname, params));
    if (!fs.existsSync(file)) {
      const generic = path.join(MOCK_DIR, `${pathname.replace(/\//g, "_")}.json`);
      if (fs.existsSync(generic)) return JSON.parse(fs.readFileSync(generic, "utf8"));
      throw new Error(`No mock for ${pathname} ${JSON.stringify(params)} (expected ${file})`);
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, cacheKey(pathname, params));
  if (!opts.noCache && fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not set (or set API_FOOTBALL_MOCK=1)");

  const url = new URL(AF_BASE + pathname);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let res: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    await throttle();
    try {
      res = await fetch(url, { headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(30_000) });
    } catch (err) {
      const backoff = 10_000 * (attempt + 1);
      console.warn(`API-Football network error on ${pathname} (${(err as Error).message}); retrying in ${backoff / 1000}s`);
      await sleep(backoff);
      continue;
    }
    lastRate.dayLimit = num(res.headers.get("x-ratelimit-requests-limit"));
    lastRate.dayRemaining = num(res.headers.get("x-ratelimit-requests-remaining"));
    lastRate.minuteLimit = num(res.headers.get("x-ratelimit-limit"));
    lastRate.minuteRemaining = num(res.headers.get("x-ratelimit-remaining"));
    // Rate limiting arrives either as HTTP 429 or as HTTP 200 with errors.rateLimit.
    let limited = res.status === 429;
    let body: AfResponse<T> | null = null;
    if (!limited && res.ok) {
      body = (await res.json()) as AfResponse<T>;
      const errs = body.errors;
      if (errs && !Array.isArray(errs) && "rateLimit" in errs) limited = true;
    }
    if (limited) {
      const backoff = 20_000 * (attempt + 1);
      console.warn(`API-Football rate limited on ${pathname}; waiting ${backoff / 1000}s`);
      await sleep(backoff);
      continue;
    }
    if (!res.ok) throw new Error(`API-Football ${pathname}: HTTP ${res.status}`);
    const errs = body!.errors;
    if (errs && !Array.isArray(errs) && Object.keys(errs).length > 0) {
      throw new Error(`API-Football ${pathname}: ${JSON.stringify(errs)}`);
    }
    fs.writeFileSync(file, JSON.stringify(body));
    return body!;
  }
  throw new Error(`API-Football ${pathname}: giving up after retries`);
}

function num(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---- Endpoint helpers -------------------------------------------------------

export async function fixturesByDate(date: string, leagueId: number, season: number, opts?: GetOptions) {
  return (await afGet<AfFixture>("/fixtures", { date, league: leagueId, season }, opts)).response;
}

/** All fixtures of a league season (one request). Used for model history and results. */
export async function fixturesBySeason(leagueId: number, season: number, opts?: GetOptions) {
  return (await afGet<AfFixture>("/fixtures", { league: leagueId, season }, opts)).response;
}

/** Up to 20 fixture ids per request. */
export async function fixturesByIds(ids: number[], opts?: GetOptions) {
  const out: AfFixture[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    out.push(...(await afGet<AfFixture>("/fixtures", { ids: chunk.join("-") }, opts)).response);
  }
  return out;
}

export async function oddsForFixture(fixtureId: number, bookmaker = BOOKMAKER_BET365) {
  return (await afGet<AfOdds>("/odds", { fixture: fixtureId, bookmaker })).response;
}

export async function injuriesForFixture(fixtureId: number) {
  return (await afGet<AfInjury>("/injuries", { fixture: fixtureId })).response;
}

export async function standings(leagueId: number, season: number) {
  const res = await afGet<{ league: { id: number; standings: AfStandingRow[][] } }>("/standings", { league: leagueId, season });
  return res.response[0]?.league.standings.flat() ?? [];
}

export async function status() {
  return afGet<never>("/status", {}, { noCache: true });
}

// ---- Normalisation ----------------------------------------------------------

export interface NormalizedOdds {
  h: number | null;
  d: number | null;
  a: number | null;
  over25: number | null;
  under25: number | null;
  bttsYes: number | null;
  bttsNo: number | null;
  bookmaker: string | null;
}

/** Pull 1X2, O/U 2.5 and BTTS from an /odds response for one bookmaker. */
export function normalizeOdds(odds: AfOdds[]): NormalizedOdds {
  const out: NormalizedOdds = { h: null, d: null, a: null, over25: null, under25: null, bttsYes: null, bttsNo: null, bookmaker: null };
  const bm = odds[0]?.bookmakers[0];
  if (!bm) return out;
  out.bookmaker = bm.name;
  for (const bet of bm.bets) {
    const name = bet.name.toLowerCase();
    if (name === "match winner") {
      for (const v of bet.values) {
        const o = Number(v.odd);
        if (v.value === "Home") out.h = o;
        else if (v.value === "Draw") out.d = o;
        else if (v.value === "Away") out.a = o;
      }
    } else if (name === "goals over/under") {
      for (const v of bet.values) {
        const o = Number(v.odd);
        if (v.value === "Over 2.5") out.over25 = o;
        else if (v.value === "Under 2.5") out.under25 = o;
      }
    } else if (name === "both teams score") {
      for (const v of bet.values) {
        const o = Number(v.odd);
        if (v.value === "Yes") out.bttsYes = o;
        else if (v.value === "No") out.bttsNo = o;
      }
    }
  }
  return out;
}

/** Season year as API-Football expresses it (start year of the season) for a given date. */
export function seasonForDate(d: Date): number {
  // European seasons start in July/August.
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

export const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
export const VOID_STATUSES = new Set(["PST", "CANC", "ABD", "AWD", "WO"]);

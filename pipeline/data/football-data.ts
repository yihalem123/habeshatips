/**
 * Loader for football-data.co.uk season CSVs.
 * These files carry full-time results plus pre-match and closing bookmaker odds,
 * which is everything the walk-forward backtest needs. No API key required.
 */
import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";

export const LEAGUES = {
  E0: { name: "Premier League", country: "England", apiFootballId: 39 },
  SP1: { name: "La Liga", country: "Spain", apiFootballId: 140 },
  I1: { name: "Serie A", country: "Italy", apiFootballId: 135 },
  D1: { name: "Bundesliga", country: "Germany", apiFootballId: 78 },
  F1: { name: "Ligue 1", country: "France", apiFootballId: 61 },
} as const;

export type LeagueCode = keyof typeof LEAGUES;
export const LEAGUE_CODES = Object.keys(LEAGUES) as LeagueCode[];

export interface Odds1x2 {
  h: number;
  d: number;
  a: number;
}

export interface OddsOU {
  over: number;
  under: number;
}

export interface MatchOdds {
  /** Bet365 pre-match odds (collected ~Friday before the weekend). */
  open: Odds1x2 | null;
  /** Bet365 closing odds. */
  close: Odds1x2 | null;
  /** Market average pre-match odds across bookmakers. */
  avg: Odds1x2 | null;
  /** Best available pre-match odds. */
  max: Odds1x2 | null;
  ou25: OddsOU | null;
  ou25Close: OddsOU | null;
}

export interface Match {
  league: LeagueCode;
  season: string; // e.g. "2526"
  date: Date; // kickoff date (local UK, time ignored)
  home: string;
  away: string;
  hg: number;
  ag: number;
  result: "H" | "D" | "A";
  odds: MatchOdds;
}

export const DATA_DIR = path.resolve(process.cwd(), "data/football-data");

function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function odds1x2(row: Record<string, string>, h: string, d: string, a: string): Odds1x2 | null {
  const oh = num(row[h]);
  const od = num(row[d]);
  const oa = num(row[a]);
  return oh && od && oa ? { h: oh, d: od, a: oa } : null;
}

function oddsOU(row: Record<string, string>, over: string, under: string): OddsOU | null {
  const o = num(row[over]);
  const u = num(row[under]);
  return o && u ? { over: o, under: u } : null;
}

function parseDate(s: string): Date {
  // dd/mm/yyyy (older files use dd/mm/yy)
  const [dd, mm, yy] = s.split("/");
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  return new Date(Date.UTC(year, Number(mm) - 1, Number(dd)));
}

export function parseSeasonCsv(csv: string, league: LeagueCode, season: string): Match[] {
  const rows = parse(csv.replace(/^﻿/, ""), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[];

  const out: Match[] = [];
  for (const row of rows) {
    if (!row.Date || row.FTHG === "" || row.FTAG === "" || row.FTHG === undefined) continue;
    const hg = Number(row.FTHG);
    const ag = Number(row.FTAG);
    if (!Number.isFinite(hg) || !Number.isFinite(ag)) continue;
    out.push({
      league,
      season,
      date: parseDate(row.Date),
      home: row.HomeTeam,
      away: row.AwayTeam,
      hg,
      ag,
      result: hg > ag ? "H" : hg < ag ? "A" : "D",
      odds: {
        open: odds1x2(row, "B365H", "B365D", "B365A"),
        close: odds1x2(row, "B365CH", "B365CD", "B365CA"),
        avg: odds1x2(row, "AvgH", "AvgD", "AvgA"),
        max: odds1x2(row, "MaxH", "MaxD", "MaxA"),
        ou25: oddsOU(row, "B365>2.5", "B365<2.5"),
        ou25Close: oddsOU(row, "B365C>2.5", "B365C<2.5"),
      },
    });
  }
  return out.sort((x, y) => x.date.getTime() - y.date.getTime());
}

export function loadSeason(league: LeagueCode, season: string): Match[] {
  const file = path.join(DATA_DIR, `${league}_${season}.csv`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${file}. Run: pnpm fetch:fd`);
  }
  return parseSeasonCsv(fs.readFileSync(file, "utf8"), league, season);
}

export function loadSeasons(leagues: LeagueCode[], seasons: string[]): Match[] {
  const all: Match[] = [];
  for (const league of leagues) {
    for (const season of seasons) {
      const file = path.join(DATA_DIR, `${league}_${season}.csv`);
      if (!fs.existsSync(file)) continue;
      all.push(...loadSeason(league, season));
    }
  }
  return all.sort((x, y) => x.date.getTime() - y.date.getTime());
}

/** Season codes in chronological order up to and including `last`, e.g. ["2324","2425","2526"]. */
export function seasonRange(first: string, last: string): string[] {
  const out: string[] = [];
  let start = Number(first.slice(0, 2));
  const end = Number(last.slice(0, 2));
  while (start <= end) {
    out.push(`${String(start).padStart(2, "0")}${String(start + 1).padStart(2, "0")}`);
    start++;
  }
  return out;
}

/**
 * Ingest via the provider registry.
 *
 * - History (model training): football-data.co.uk CSVs for the big five (complete, free,
 *   with odds) plus OpenLigaDB / football-data.org for the Champions League.
 * - Today's fixtures and results: first eligible fixtures provider (football-data.org when a
 *   key is set, else ESPN, else OpenLigaDB).
 * - Standings: football-data.org or OpenLigaDB.
 * - Odds: The Odds API (when a key is set and credits remain), else ESPN/DraftKings.
 *
 * All fixtures are keyed by canonical team names (pipeline/data/teams.ts).
 */
import crypto from "node:crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { COMPETITIONS, COMPETITION_CODES, type CompetitionCode } from "../data/api-football";
import { LEAGUE_CODES, loadSeasons, seasonRange } from "../data/football-data";
import { canonicalTeam, fixtureId } from "../data/teams";
import { withProvider } from "../providers/registry";
import type { ProviderFixture, ProviderOdds, ProviderStanding } from "../providers/types";

type FixtureInsert = typeof schema.fixtures.$inferInsert;

export function seasonCode(season: number): string {
  return `${String(season % 100).padStart(2, "0")}${String((season + 1) % 100).padStart(2, "0")}`;
}

export function providerFixtureRow(f: ProviderFixture): FixtureInsert | null {
  const home = canonicalTeam(f.homeRaw);
  const away = canonicalTeam(f.awayRaw);
  if (!home || !away) return null;
  return {
    id: fixtureId(f.competition, f.kickoffUtc, home, away),
    externalIds: { [f.provider]: f.externalId },
    leagueCode: f.competition,
    leagueName: COMPETITIONS[f.competition].name,
    season: String(f.season),
    home,
    away,
    round: f.round,
    kickoffAt: f.kickoffUtc,
    status: f.status,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    updatedAt: new Date(),
  };
}

export async function upsertFixtures(rows: FixtureInsert[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    if (chunk.length === 0) continue;
    await db
      .insert(schema.fixtures)
      .values(chunk)
      .onConflictDoUpdate({
        target: schema.fixtures.id,
        set: {
          externalIds: sql`${schema.fixtures.externalIds} || excluded.external_ids`,
          status: sql`excluded.status`,
          homeGoals: sql`coalesce(excluded.home_goals, ${schema.fixtures.homeGoals})`,
          awayGoals: sql`coalesce(excluded.away_goals, ${schema.fixtures.awayGoals})`,
          kickoffAt: sql`excluded.kickoff_at`,
          round: sql`coalesce(excluded.round, ${schema.fixtures.round})`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }
}

/** Big-five history from football-data.co.uk CSVs (already canonical names). */
export async function ingestCsvHistory(seasons: string[]) {
  const matches = loadSeasons(LEAGUE_CODES, seasons);
  const rows: FixtureInsert[] = matches.map((m) => ({
    id: fixtureId(m.league, m.date, m.home, m.away),
    externalIds: {},
    leagueCode: m.league,
    leagueName: COMPETITIONS[m.league as CompetitionCode].name,
    season: String(2000 + Number(m.season.slice(0, 2))),
    home: m.home,
    away: m.away,
    kickoffAt: new Date(m.date.getTime() + 15 * 3600_000), // CSV has no kickoff time; 15:00 UTC placeholder
    status: "finished",
    homeGoals: m.hg,
    awayGoals: m.ag,
    updatedAt: new Date(),
  }));
  // CSV rows must not overwrite a provider row's real kickoff time: insert only when missing.
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(schema.fixtures).values(rows.slice(i, i + 200)).onConflictDoNothing();
  }
  return rows.length;
}

/** UCL history (and any competition the CSVs lack) from OpenLigaDB whole-season dumps. */
export async function ingestSeasonHistory(competition: CompetitionCode, season: number) {
  const r = await withProvider("fixtures", competition, (p) => p.fixtures!(competition, season), {
    accept: (rows) => rows.length > 0,
  });
  if (!r) return 0;
  const rows = r.result.map(providerFixtureRow).filter((x): x is FixtureInsert => !!x);
  await upsertFixtures(rows);
  return rows.length;
}

export interface IngestResult {
  date: string;
  season: number;
  todayFixtures: number;
  standings: Map<CompetitionCode, Map<string, ProviderStanding>>;
  oddsSnapshots: number;
}

export function seasonForDate(d: Date): number {
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

export async function ingest(date: string, opts: { historySeasons?: number } = {}): Promise<IngestResult> {
  const season = seasonForDate(new Date(date));
  const historySeasons = opts.historySeasons ?? 1;

  // 1. History for the model.
  const csvSeasons = seasonRange(seasonCode(season - historySeasons), seasonCode(season));
  const csvRows = await ingestCsvHistory(csvSeasons);
  let uclRows = 0;
  for (let s = season - historySeasons; s <= season; s++) uclRows += await ingestSeasonHistory("UCL", s);
  console.log(`ingest ${date}: history ${csvRows} csv rows (${csvSeasons.join(",")}), ${uclRows} UCL rows`);

  // 2. Fixtures for yesterday (late results), today and tomorrow. Settlement fetches its own
  //    ranges, so a wider window here would only burn requests.
  const from = new Date(new Date(`${date}T00:00:00Z`).getTime() - 1 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(new Date(`${date}T00:00:00Z`).getTime() + 2 * 86_400_000).toISOString().slice(0, 10);
  let todayFixtures = 0;
  for (const code of COMPETITION_CODES) {
    const r = await withProvider("fixtures", code, (p) => p.fixtures!(code, season, { from, to }), { accept: () => true });
    if (!r) continue;
    const rows = r.result.map(providerFixtureRow).filter((x): x is FixtureInsert => !!x);
    await upsertFixtures(rows);
    todayFixtures += rows.filter((x) => x.kickoffAt.toISOString().startsWith(date)).length;
  }

  // 3. Standings.
  const standings = new Map<CompetitionCode, Map<string, ProviderStanding>>();
  for (const code of COMPETITION_CODES) {
    const r = await withProvider("standings", code, (p) => p.standings!(code, season), { accept: (rows) => rows.length > 0 });
    const m = new Map<string, ProviderStanding>();
    for (const row of r?.result ?? []) {
      const c = canonicalTeam(row.teamRaw);
      if (c) m.set(c, row);
    }
    standings.set(code, m);
  }

  // 4. Odds for upcoming fixtures.
  let oddsSnapshots = 0;
  for (const code of COMPETITION_CODES) {
    const r = await withProvider("odds", code, (p) => p.odds!(code), { credits: 2, accept: () => true });
    if (!r) continue;
    oddsSnapshots += await storeOdds(r.result);
  }

  console.log(`ingest ${date}: ${todayFixtures} fixtures today, ${oddsSnapshots} odds snapshots`);
  return { date, season, todayFixtures, standings, oddsSnapshots };
}

async function storeOdds(odds: ProviderOdds[]): Promise<number> {
  let n = 0;
  for (const o of odds) {
    const home = canonicalTeam(o.homeRaw);
    const away = canonicalTeam(o.awayRaw);
    if (!home || !away) continue;
    // Match the fixture within ±1 day of the quoted kickoff (time zones, provider rounding).
    const lo = new Date(o.kickoffUtc.getTime() - 86_400_000);
    const hi = new Date(o.kickoffUtc.getTime() + 86_400_000);
    const [f] = await db
      .select({ id: schema.fixtures.id })
      .from(schema.fixtures)
      .where(and(eq(schema.fixtures.leagueCode, o.competition), eq(schema.fixtures.home, home), eq(schema.fixtures.away, away), gte(schema.fixtures.kickoffAt, lo), lt(schema.fixtures.kickoffAt, hi)));
    if (!f) continue;
    await db.insert(schema.oddsSnapshots).values({
      id: crypto.randomUUID(),
      fixtureId: f.id,
      provider: o.provider,
      bookmaker: o.bookmaker,
      h: o.h?.toFixed(3) ?? null,
      d: o.d?.toFixed(3) ?? null,
      a: o.a?.toFixed(3) ?? null,
      over25: o.over25?.toFixed(3) ?? null,
      under25: o.under25?.toFixed(3) ?? null,
      bttsYes: o.bttsYes?.toFixed(3) ?? null,
      bttsNo: o.bttsNo?.toFixed(3) ?? null,
    });
    n++;
  }
  return n;
}

export async function loadFinishedHistory() {
  return db.select().from(schema.fixtures).where(eq(schema.fixtures.status, "finished")).orderBy(schema.fixtures.kickoffAt);
}

export async function latestOdds(fixtureIdValue: string) {
  const [row] = await db
    .select()
    .from(schema.oddsSnapshots)
    .where(eq(schema.oddsSnapshots.fixtureId, fixtureIdValue))
    .orderBy(sql`${schema.oddsSnapshots.capturedAt} desc`)
    .limit(1);
  return row ?? null;
}

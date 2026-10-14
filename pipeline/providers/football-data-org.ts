/**
 * football-data.org v4. Free tier: 12 competitions incl. PL, PD, SA, BL1, FL1, CL;
 * 10 requests/minute; fixtures, results and standings; no odds.
 * Key: FOOTBALL_DATA_ORG_TOKEN.
 */
import { fetchJson } from "./http";
import type { Provider, ProviderFixture, ProviderStanding, FixtureStatus } from "./types";
import type { CompetitionCode } from "../data/api-football";

const BASE = "https://api.football-data.org/v4";
const CODES: Record<CompetitionCode, string> = { E0: "PL", SP1: "PD", I1: "SA", D1: "BL1", F1: "FL1", UCL: "CL" };

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage?: string;
  season: { startDate: string };
  homeTeam: { id: number; name: string; shortName: string | null; tla: string | null };
  awayTeam: { id: number; name: string; shortName: string | null; tla: string | null };
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
}

function mapStatus(s: string): FixtureStatus {
  switch (s) {
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "POSTPONED":
    case "SUSPENDED":
      return "postponed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function headers() {
  return { "X-Auth-Token": process.env.FOOTBALL_DATA_ORG_TOKEN ?? "" };
}

export const footballDataOrg: Provider = {
  name: "footballDataOrg",
  competitions: ["E0", "SP1", "I1", "D1", "F1", "UCL"],
  budget: { perDay: null, perMinute: 10, creditsPerMonth: null },
  available: () => !!process.env.FOOTBALL_DATA_ORG_TOKEN || process.env.PROVIDER_MOCK === "1",

  async fixtures(competition, season, range) {
    const params = new URLSearchParams({ season: String(season) });
    if (range) {
      params.set("dateFrom", range.from);
      params.set("dateTo", range.to);
    }
    const data = await fetchJson<{ matches: FdMatch[] }>({
      provider: "footballDataOrg",
      url: `${BASE}/competitions/${CODES[competition]}/matches?${params}`,
      headers: headers(),
      minIntervalMs: 6_500,
      cache: false,
      mockKey: `matches_${CODES[competition]}.json`,
    });
    return data.matches.map<ProviderFixture>((m) => ({
      provider: "footballDataOrg",
      externalId: String(m.id),
      competition,
      season,
      kickoffUtc: new Date(m.utcDate),
      homeRaw: m.homeTeam.name,
      awayRaw: m.awayTeam.name,
      status: mapStatus(m.status),
      homeGoals: m.score.fullTime.home,
      awayGoals: m.score.fullTime.away,
      round: m.matchday !== null ? `${m.stage ?? "REGULAR_SEASON"} - ${m.matchday}` : (m.stage ?? null),
    }));
  },

  async standings(competition, season) {
    const data = await fetchJson<{ standings: { type: string; table: { position: number; team: { name: string }; playedGames: number; points: number; goalsFor: number; goalsAgainst: number }[] }[] }>({
      provider: "footballDataOrg",
      url: `${BASE}/competitions/${CODES[competition]}/standings?season=${season}`,
      headers: headers(),
      minIntervalMs: 6_500,
      cache: false,
      mockKey: `standings_${CODES[competition]}.json`,
    });
    const total = data.standings.find((s) => s.type === "TOTAL") ?? data.standings[0];
    return (total?.table ?? []).map<ProviderStanding>((r) => ({
      teamRaw: r.team.name,
      rank: r.position,
      points: r.points,
      played: r.playedGames,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
    }));
  },
};

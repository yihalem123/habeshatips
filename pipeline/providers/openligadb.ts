/**
 * OpenLigaDB (community-maintained, no key). Serves PL, La Liga, Bundesliga and UCL for the
 * current season. Results can lag by days, so it is a fallback for fixtures/results, not primary.
 */
import { fetchJson } from "./http";
import type { Provider, ProviderFixture, ProviderStanding } from "./types";
import type { CompetitionCode } from "../data/api-football";

const BASE = "https://api.openligadb.de";
const SHORTCUTS: Partial<Record<CompetitionCode, string>> = { E0: "pl", SP1: "la1", D1: "bl1", UCL: "ucl" };

interface OlMatch {
  matchID: number;
  matchDateTimeUTC: string;
  matchIsFinished: boolean;
  group?: { groupName: string; groupOrderID: number };
  team1: { teamName: string };
  team2: { teamName: string };
  matchResults: { resultTypeID: number; pointsTeam1: number; pointsTeam2: number }[];
}

export const openLigaDb: Provider = {
  name: "openLigaDb",
  competitions: ["E0", "SP1", "D1", "UCL"],
  budget: { perDay: null, perMinute: 30, creditsPerMonth: null },
  available: () => true,

  async fixtures(competition, season, range) {
    const sc = SHORTCUTS[competition];
    if (!sc) return [];
    const data = await fetchJson<OlMatch[]>({
      provider: "openLigaDb",
      url: `${BASE}/getmatchdata/${sc}/${season}`,
      minIntervalMs: 2_000,
      cache: false,
      mockKey: `matchdata_${sc}_${season}.json`,
    });
    const out = data.map<ProviderFixture>((m) => {
      const ft = m.matchResults.find((r) => r.resultTypeID === 2) ?? m.matchResults[m.matchResults.length - 1];
      return {
        provider: "openLigaDb",
        externalId: String(m.matchID),
        competition,
        season,
        kickoffUtc: new Date(m.matchDateTimeUTC),
        homeRaw: m.team1.teamName.trim(),
        awayRaw: m.team2.teamName.trim(),
        status: m.matchIsFinished ? "finished" : "scheduled",
        homeGoals: m.matchIsFinished && ft ? ft.pointsTeam1 : null,
        awayGoals: m.matchIsFinished && ft ? ft.pointsTeam2 : null,
        round: m.group?.groupName ?? null,
      };
    });
    if (!range) return out;
    const from = new Date(`${range.from}T00:00:00Z`).getTime();
    const to = new Date(`${range.to}T23:59:59Z`).getTime();
    return out.filter((f) => f.kickoffUtc.getTime() >= from && f.kickoffUtc.getTime() <= to);
  },

  async standings(competition, season) {
    const sc = SHORTCUTS[competition];
    if (!sc) return [];
    const data = await fetchJson<{ teamName: string; points: number; matches: number; goals: number; opponentGoals: number }[]>({
      provider: "openLigaDb",
      url: `${BASE}/getbltable/${sc}/${season}`,
      minIntervalMs: 2_000,
      cache: false,
      mockKey: `bltable_${sc}_${season}.json`,
    });
    return data.map<ProviderStanding>((r, i) => ({
      teamRaw: r.teamName.trim(),
      rank: i + 1,
      points: r.points,
      played: r.matches,
      goalsFor: r.goals,
      goalsAgainst: r.opponentGoals,
    }));
  },
};

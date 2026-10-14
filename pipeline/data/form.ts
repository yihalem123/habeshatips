/** Recent-form helpers computed from historical matches (strictly before a given date). */
import type { Match } from "./football-data";

export interface FormSummary {
  played: number;
  points: number;
  ppg: number;
  goalsFor: number;
  goalsAgainst: number;
}

const EMPTY: FormSummary = { played: 0, points: 0, ppg: 0, goalsFor: 0, goalsAgainst: 0 };

function summarize(entries: { gf: number; ga: number }[]): FormSummary {
  if (entries.length === 0) return EMPTY;
  let points = 0;
  let gf = 0;
  let ga = 0;
  for (const e of entries) {
    points += e.gf > e.ga ? 3 : e.gf === e.ga ? 1 : 0;
    gf += e.gf;
    ga += e.ga;
  }
  return { played: entries.length, points, ppg: points / entries.length, goalsFor: gf, goalsAgainst: ga };
}

/** Last `n` matches for `team` before `before`, optionally restricted to home or away games. */
export function recentForm(
  history: Match[],
  team: string,
  before: Date,
  n = 5,
  venue: "home" | "away" | "all" = "all",
): FormSummary {
  const entries: { gf: number; ga: number }[] = [];
  for (let i = history.length - 1; i >= 0 && entries.length < n; i--) {
    const m = history[i];
    if (m.date >= before) continue;
    if (m.home === team && venue !== "away") entries.push({ gf: m.hg, ga: m.ag });
    else if (m.away === team && venue !== "home") entries.push({ gf: m.ag, ga: m.hg });
  }
  return summarize(entries);
}

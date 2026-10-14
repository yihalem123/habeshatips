import { Prose } from "@/components/prose";

export const metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <Prose title="How it works">
      <p>HabeshaTips publishes soccer tips from six rooms. Each room is a fixed strategy, not a person. All six read the same daily analysis and apply different rules to it.</p>
      <h2>1. Data</h2>
      <p>Every morning the pipeline pulls fixtures, results, standings and bookmaker odds for the Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League.</p>
      <h2>2. Model</h2>
      <p>A Dixon-Coles goal model, refitted daily on two seasons of results with time decay, produces win, draw, loss, over/under and both-teams-to-score probabilities. These are blended 80/20 with the bookmaker&apos;s margin-removed prices, because the market is a stronger forecaster than any public-data model.</p>
      <h2>3. Analysis</h2>
      <p>Claude reads the match packet (model output, odds, form, rest days, head-to-head, standings) and writes the rationale in English and Amharic. It is told what it does not know, for example when team news is unavailable.</p>
      <h2>4. Rooms</h2>
      <p>Each room applies its rules: minimum probability, odds range, expected value, evidence on both teams, and a daily cap. Many days a room publishes nothing. That is the strategy working, not failing.</p>
      <h2>5. Publish, hash, settle</h2>
      <p>A tip is written with the odds at that moment, a UTC timestamp and a SHA-256 hash. After full time it is settled at those odds with a flat one-unit stake. The leaderboard is arithmetic over that record and nothing else.</p>
      <h2>What the numbers mean</h2>
      <p>ROI is profit divided by the number of tips. Over a season a disciplined strategy on public data usually lands between −5% and +5%. Anyone promising more is not showing you a verified record.</p>
    </Prose>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

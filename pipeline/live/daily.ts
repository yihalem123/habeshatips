/**
 * Daily pipeline: ingest → analyze → publish (model + claude) → settle → leaderboard.
 * Usage: pnpm live:daily [--date 2026-10-17] [--skip-claude] [--only ingest|analyze|publish|deliver|settle|leaderboard|results|expiry]
 */
import "../env";
import { parseArgs } from "node:util";
import { closeDb } from "./db";
import { ingest } from "./ingest";
import { analyzeDate } from "./analyze";
import { publishDate } from "./publish";
import { settlePending } from "./settle";
import { recomputeLeaderboard } from "./leaderboard";
import { seedRooms } from "./seed-rooms";
import { deliverDate, enforceExpiry, postResults, sendReminders } from "../delivery/deliver";

const { values } = parseArgs({
  options: {
    date: { type: "string", default: new Date().toISOString().slice(0, 10) },
    "skip-claude": { type: "boolean", default: false },
    /** Re-run analysis even if one exists for the fixture. */
    refresh: { type: "boolean", default: false },
    /** Analyse at most N fixtures (cost control / testing). */
    limit: { type: "string" },
    /** Testing on past dates: analyse and publish finished fixtures too. */
    "allow-finished": { type: "boolean", default: false },
    only: { type: "string" },
    /** Override "now" for settlement (testing). */
    now: { type: "string" },
  },
});

async function main() {
  const date = values.date!;
  const only = values.only;
  const run = (step: string) => !only || only === step;

  await seedRooms();
  let standings = new Map();
  if (run("ingest") || run("analyze")) {
    const r = await ingest(date);
    standings = r.standings;
  }
  const allowFinished = values["allow-finished"];
  if (run("analyze")) {
    await analyzeDate(date, standings, {
      skipClaude: values["skip-claude"],
      refresh: values.refresh,
      limit: values.limit ? Number(values.limit) : undefined,
      allowFinished,
    });
  }
  if (run("publish")) {
    await publishDate(date, "model", { allowFinished });
    await publishDate(date, "claude", { allowFinished });
  }
  if (run("deliver")) await deliverDate(date);
  const now = values.now ? new Date(values.now) : new Date();
  if (run("settle")) await settlePending(now);
  if (run("leaderboard")) await recomputeLeaderboard(now);
  if (run("results")) await postResults(now);
  if (run("expiry")) {
    await enforceExpiry(now);
    await sendReminders(now);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());

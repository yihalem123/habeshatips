/** Refresh results for fixtures with pending tips (via the provider registry) and settle them. */
import { and, eq, inArray, lt } from "drizzle-orm";
import { db, schema } from "./db";
import { COMPETITION_CODES, type CompetitionCode } from "../data/api-football";
import { withProvider } from "../providers/registry";
import { providerFixtureRow, seasonForDate, upsertFixtures } from "./ingest";
import { settle, profitUnits } from "../rooms/settle";

export async function settlePending(now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 3600_000);
  const pending = await db
    .select({ fixtureId: schema.tips.fixtureId })
    .from(schema.tips)
    .innerJoin(schema.fixtures, eq(schema.tips.fixtureId, schema.fixtures.id))
    .where(and(eq(schema.tips.result, "pending"), eq(schema.tips.isBacktest, false), lt(schema.fixtures.kickoffAt, cutoff)));
  const fixtureIds = Array.from(new Set(pending.map((p) => p.fixtureId)));
  if (fixtureIds.length === 0) {
    console.log("settle: nothing pending");
    return { settled: 0 };
  }

  const rows = await db.select().from(schema.fixtures).where(inArray(schema.fixtures.id, fixtureIds));
  // Refresh results per competition over the date span of the pending fixtures.
  const byComp = new Map<CompetitionCode, { from: Date; to: Date }>();
  for (const r of rows) {
    const code = r.leagueCode as CompetitionCode;
    const cur = byComp.get(code);
    byComp.set(code, { from: cur && cur.from < r.kickoffAt ? cur.from : r.kickoffAt, to: cur && cur.to > r.kickoffAt ? cur.to : r.kickoffAt });
  }
  for (const code of COMPETITION_CODES) {
    const span = byComp.get(code);
    if (!span) continue;
    const season = seasonForDate(span.to);
    const range = { from: span.from.toISOString().slice(0, 10), to: span.to.toISOString().slice(0, 10) };
    const r = await withProvider("results", code, (p) => p.fixtures!(code, season, range), {
      accept: (list) => list.some((f) => f.status === "finished"),
    });
    if (!r) continue;
    const upserts = r.result.map(providerFixtureRow).filter((x): x is NonNullable<typeof x> => !!x);
    await upsertFixtures(upserts);
  }

  const updated = await db.select().from(schema.fixtures).where(inArray(schema.fixtures.id, fixtureIds));
  let settled = 0;
  for (const f of updated) {
    const tips = await db
      .select()
      .from(schema.tips)
      .where(and(eq(schema.tips.fixtureId, f.id), eq(schema.tips.result, "pending")));
    for (const t of tips) {
      let result: "win" | "loss" | "void" | null = null;
      if (f.status === "finished" && f.homeGoals !== null && f.awayGoals !== null) {
        result = settle({ market: t.market, selection: t.selection as never }, f.homeGoals, f.awayGoals);
      } else if (f.status === "postponed" || f.status === "cancelled") {
        result = "void";
      }
      if (!result) continue;
      await db
        .update(schema.tips)
        .set({ result, profitUnits: profitUnits(result, Number(t.oddsAtPublish)).toFixed(3), settledAt: new Date() })
        .where(eq(schema.tips.id, t.id));
      settled++;
    }
  }
  console.log(`settle: ${settled} tips settled across ${fixtureIds.length} fixtures`);
  return { settled };
}

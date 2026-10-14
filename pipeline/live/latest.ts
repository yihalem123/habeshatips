/** Latest analysis per fixture (several runs per fixture are allowed; the newest wins). */
import { desc, inArray } from "drizzle-orm";
import { db, schema } from "./db";

export type AnalysisRow = typeof schema.matchAnalyses.$inferSelect;

export async function latestAnalyses(fixtureIds: string[]): Promise<Map<string, AnalysisRow>> {
  const out = new Map<string, AnalysisRow>();
  if (fixtureIds.length === 0) return out;
  const rows = await db
    .select()
    .from(schema.matchAnalyses)
    .where(inArray(schema.matchAnalyses.fixtureId, fixtureIds))
    .orderBy(desc(schema.matchAnalyses.runAt));
  for (const r of rows) if (!out.has(r.fixtureId)) out.set(r.fixtureId, r);
  return out;
}

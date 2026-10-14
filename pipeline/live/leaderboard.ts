/** Recompute leaderboard snapshots per room, basis and period, and print them. */
import crypto from "node:crypto";
import { and, eq, gte, inArray, ne } from "drizzle-orm";
import { db, schema } from "./db";

const PERIODS = { all: null, "30d": 30, "7d": 7 } as const;

interface Agg {
  tips: number;
  wins: number;
  profit: number;
}

function agg(rows: { result: string; profitUnits: string | null }[]): Agg {
  const a: Agg = { tips: 0, wins: 0, profit: 0 };
  for (const r of rows) {
    if (r.result === "void" || r.result === "pending") continue;
    a.tips++;
    if (r.result === "win") a.wins++;
    a.profit += Number(r.profitUnits ?? 0);
  }
  return a;
}

export async function recomputeLeaderboard(now = new Date()) {
  const rooms = await db.select().from(schema.rooms);
  const lines: string[] = [];
  lines.push("room | basis | period | tips | win% | profit | ROI");
  for (const room of rooms) {
    for (const basis of ["model", "claude"] as const) {
      for (const [period, days] of Object.entries(PERIODS)) {
        const conds = [eq(schema.tips.roomId, room.id), eq(schema.tips.basis, basis), eq(schema.tips.isBacktest, false), ne(schema.tips.result, "pending")];
        if (days) conds.push(gte(schema.tips.settledAt, new Date(now.getTime() - days * 86_400_000)));
        const rows = await db.select({ result: schema.tips.result, profitUnits: schema.tips.profitUnits }).from(schema.tips).where(and(...conds));
        const a = agg(rows);
        await writeSnapshot(room.id, `${basis}:${period}`, a, now);
        if (a.tips > 0) lines.push(fmt(room.slug, basis, period, a));
      }
    }
    const bt = await db
      .select({ result: schema.tips.result, profitUnits: schema.tips.profitUnits })
      .from(schema.tips)
      .where(and(eq(schema.tips.roomId, room.id), eq(schema.tips.isBacktest, true), inArray(schema.tips.result, ["win", "loss"])));
    const a = agg(bt);
    await writeSnapshot(room.id, "backtest", a, now);
    if (a.tips > 0) lines.push(fmt(room.slug, "model", "backtest", a));
  }
  console.log(lines.join("\n"));
}

function fmt(slug: string, basis: string, period: string, a: Agg) {
  return `${slug} | ${basis} | ${period} | ${a.tips} | ${((a.wins / a.tips) * 100).toFixed(1)}% | ${a.profit.toFixed(2)} | ${((a.profit / a.tips) * 100).toFixed(1)}%`;
}

async function writeSnapshot(roomId: string, period: string, a: Agg, now: Date) {
  await db.insert(schema.leaderboardSnapshots).values({
    id: crypto.randomUUID(),
    roomId,
    period,
    tipsCount: a.tips,
    wins: a.wins,
    profitUnits: a.profit.toFixed(3),
    roi: (a.tips ? a.profit / a.tips : 0).toFixed(4),
    winRate: (a.tips ? a.wins / a.tips : 0).toFixed(4),
    computedAt: now,
  });
}

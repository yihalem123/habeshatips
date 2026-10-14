import { and, desc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, leaderboardSnapshots, rooms, subscriptions, tips } from "@/db/schema";

/** Which basis the public site shows. The other basis stays internal (shadow comparison). */
export const PUBLIC_BASIS = (process.env.PUBLIC_BASIS ?? "model") as "model" | "claude";
export type Period = "all" | "30d" | "7d" | "backtest";
export const PERIODS: Period[] = ["all", "30d", "7d", "backtest"];

export type RoomRow = typeof rooms.$inferSelect;

export interface Stats {
  tips: number;
  wins: number;
  winRate: number;
  profit: number;
  roi: number;
  computedAt: Date | null;
}

const EMPTY: Stats = { tips: 0, wins: 0, winRate: 0, profit: 0, roi: 0, computedAt: null };

function periodKey(period: Period) {
  return period === "backtest" ? "backtest" : `${PUBLIC_BASIS}:${period}`;
}

async function latestSnapshots(period: Period): Promise<Map<string, Stats>> {
  const rows = await db
    .select()
    .from(leaderboardSnapshots)
    .where(eq(leaderboardSnapshots.period, periodKey(period)))
    .orderBy(desc(leaderboardSnapshots.computedAt));
  const out = new Map<string, Stats>();
  for (const r of rows) {
    if (out.has(r.roomId)) continue;
    out.set(r.roomId, {
      tips: r.tipsCount,
      wins: r.wins,
      winRate: Number(r.winRate),
      profit: Number(r.profitUnits),
      roi: Number(r.roi),
      computedAt: r.computedAt,
    });
  }
  return out;
}

export interface LeaderboardRow {
  room: RoomRow;
  stats: Stats;
  rank: number;
}

export async function getLeaderboard(period: Period): Promise<LeaderboardRow[]> {
  const [roomRows, snaps] = await Promise.all([db.select().from(rooms).where(eq(rooms.active, true)), latestSnapshots(period)]);
  const rows = roomRows.map((room) => ({ room, stats: snaps.get(room.id) ?? EMPTY, rank: 0 }));
  rows.sort((x, y) => (y.stats.tips === 0) === (x.stats.tips === 0) ? y.stats.roi - x.stats.roi : y.stats.tips - x.stats.tips);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface TipView {
  id: string;
  roomId: string;
  roomSlug: string;
  roomNameEn: string;
  roomNameAm: string;
  home: string;
  away: string;
  leagueName: string;
  kickoffAt: Date;
  fixtureStatus: string;
  homeGoals: number | null;
  awayGoals: number | null;
  market: string;
  selection: string;
  odds: number;
  modelProb: number;
  confidence: number | null;
  result: string;
  profit: number | null;
  publishedAt: Date;
  hash: string;
  rationaleEn: string;
  rationaleAm: string;
  isBacktest: boolean;
}

function toTipView(t: typeof tips.$inferSelect, f: typeof fixtures.$inferSelect, r: RoomRow): TipView {
  return {
    id: t.id,
    roomId: r.id,
    roomSlug: r.slug,
    roomNameEn: r.nameEn,
    roomNameAm: r.nameAm,
    home: f.home,
    away: f.away,
    leagueName: f.leagueName,
    kickoffAt: f.kickoffAt,
    fixtureStatus: f.status,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    market: t.market,
    selection: t.selection,
    odds: Number(t.oddsAtPublish),
    modelProb: Number(t.modelProb),
    confidence: t.confidence,
    result: t.result,
    profit: t.profitUnits === null ? null : Number(t.profitUnits),
    publishedAt: t.publishedAt,
    hash: t.hash,
    rationaleEn: t.rationaleEn,
    rationaleAm: t.rationaleAm,
    isBacktest: t.isBacktest,
  };
}

export interface RoomDetail {
  room: RoomRow;
  live: Stats;
  backtest: Stats;
  /** Cumulative profit after each settled tip (live if any, else backtest), oldest first. */
  equity: number[];
  equityIsBacktest: boolean;
  recentTips: TipView[];
  upcomingTips: TipView[];
}

export async function getRooms(): Promise<{ room: RoomRow; live: Stats; backtest: Stats; equity: number[]; equityIsBacktest: boolean }[]> {
  const [roomRows, live, bt] = await Promise.all([db.select().from(rooms).where(eq(rooms.active, true)), latestSnapshots("all"), latestSnapshots("backtest")]);
  const out = [];
  for (const room of roomRows) {
    const eq_ = await equityCurve(room.id);
    out.push({ room, live: live.get(room.id) ?? EMPTY, backtest: bt.get(room.id) ?? EMPTY, ...eq_ });
  }
  return out;
}

async function equityCurve(roomId: string): Promise<{ equity: number[]; equityIsBacktest: boolean }> {
  const liveRows = await db
    .select({ profit: tips.profitUnits })
    .from(tips)
    .where(and(eq(tips.roomId, roomId), eq(tips.basis, PUBLIC_BASIS), eq(tips.isBacktest, false), inArray(tips.result, ["win", "loss"])))
    .orderBy(tips.publishedAt);
  const rows =
    liveRows.length > 0
      ? liveRows
      : await db
          .select({ profit: tips.profitUnits })
          .from(tips)
          .where(and(eq(tips.roomId, roomId), eq(tips.isBacktest, true), inArray(tips.result, ["win", "loss"])))
          .orderBy(tips.publishedAt);
  let acc = 0;
  const equity = [0];
  for (const r of rows) {
    acc += Number(r.profit ?? 0);
    equity.push(Number(acc.toFixed(2)));
  }
  return { equity, equityIsBacktest: liveRows.length === 0 };
}

export async function getRoomBySlug(slug: string): Promise<RoomDetail | null> {
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, slug));
  if (!room) return null;
  const [live, bt, eq_] = await Promise.all([latestSnapshots("all"), latestSnapshots("backtest"), equityCurve(room.id)]);
  const recent = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .where(and(eq(tips.roomId, room.id), eq(tips.basis, PUBLIC_BASIS), ne(tips.result, "pending")))
    .orderBy(desc(tips.publishedAt))
    .limit(40);
  const upcoming = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .where(and(eq(tips.roomId, room.id), eq(tips.basis, PUBLIC_BASIS), eq(tips.result, "pending"), eq(tips.isBacktest, false)))
    .orderBy(fixtures.kickoffAt);
  return {
    room,
    live: live.get(room.id) ?? EMPTY,
    backtest: bt.get(room.id) ?? EMPTY,
    ...eq_,
    recentTips: recent.map((r) => toTipView(r.tips, r.fixtures, room)),
    upcomingTips: upcoming.map((r) => toTipView(r.tips, r.fixtures, room)),
  };
}

export async function getTip(id: string): Promise<TipView | null> {
  const [row] = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .innerJoin(rooms, eq(tips.roomId, rooms.id))
    .where(eq(tips.id, id));
  return row ? toTipView(row.tips, row.fixtures, row.rooms) : null;
}

export async function getUserSubscriptions(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .innerJoin(rooms, eq(subscriptions.roomId, rooms.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.endsAt));
  // One row per room: the newest subscription (rows are ordered by end date, newest first).
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.rooms.id) ? false : (seen.add(r.rooms.id), true)))
    .map((r) => ({ sub: r.subscriptions, room: r.rooms, active: r.subscriptions.status === "active" && r.subscriptions.endsAt > new Date() }));
}

export async function activeRoomIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await db
    .select({ roomId: subscriptions.roomId })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"), gte(subscriptions.endsAt, new Date())));
  return new Set(rows.map((r) => r.roomId));
}

/** A pick is public once the match has kicked off; before that only subscribers see it. */
export function canViewTip(tip: TipView, subscribed: Set<string>): boolean {
  if (tip.isBacktest) return true;
  if (tip.kickoffAt <= new Date()) return true;
  return subscribed.has(tip.roomId);
}

export async function getTodayTips(roomIds: Set<string>): Promise<TipView[]> {
  if (roomIds.size === 0) return [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 86_400_000);
  const rows = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .innerJoin(rooms, eq(tips.roomId, rooms.id))
    .where(and(inArray(tips.roomId, Array.from(roomIds)), eq(tips.basis, PUBLIC_BASIS), eq(tips.isBacktest, false), gte(fixtures.kickoffAt, start), lt(fixtures.kickoffAt, end)))
    .orderBy(fixtures.kickoffAt);
  return rows.map((r) => toTipView(r.tips, r.fixtures, r.rooms));
}

export async function getLatestPublicTips(limit = 8): Promise<TipView[]> {
  const rows = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .innerJoin(rooms, eq(tips.roomId, rooms.id))
    .where(and(eq(tips.basis, PUBLIC_BASIS), eq(tips.isBacktest, false)))
    .orderBy(desc(tips.publishedAt))
    .limit(limit);
  return rows.map((r) => toTipView(r.tips, r.fixtures, r.rooms));
}

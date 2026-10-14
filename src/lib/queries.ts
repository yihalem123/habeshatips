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

// ---- Additions for the redesigned UI ------------------------------------------------

export interface RoomStatsFull extends Stats {
  avgOdds: number;
  maxDrawdown: number;
  longestLosingStreak: number;
}

/** Stats computed straight from settled tips (live when any, else backtest). */
export async function roomStatsFromTips(roomId: string, backtest: boolean): Promise<RoomStatsFull> {
  const rows = await db
    .select({ result: tips.result, profit: tips.profitUnits, odds: tips.oddsAtPublish, settledAt: tips.settledAt })
    .from(tips)
    .where(and(eq(tips.roomId, roomId), eq(tips.isBacktest, backtest), ...(backtest ? [] : [eq(tips.basis, PUBLIC_BASIS)]), inArray(tips.result, ["win", "loss"])))
    .orderBy(tips.publishedAt);
  let wins = 0;
  let profit = 0;
  let oddsSum = 0;
  let peak = 0;
  let dd = 0;
  let streak = 0;
  let longest = 0;
  let last: Date | null = null;
  for (const r of rows) {
    const p = Number(r.profit ?? 0);
    profit += p;
    oddsSum += Number(r.odds);
    if (r.result === "win") {
      wins++;
      streak = 0;
    } else {
      streak++;
      longest = Math.max(longest, streak);
    }
    peak = Math.max(peak, profit);
    dd = Math.max(dd, peak - profit);
    if (r.settledAt && (!last || r.settledAt > last)) last = r.settledAt;
  }
  const n = rows.length;
  return { tips: n, wins, winRate: n ? wins / n : 0, profit, roi: n ? profit / n : 0, computedAt: last, avgOdds: n ? oddsSum / n : 0, maxDrawdown: dd, longestLosingStreak: longest };
}

export interface LeaderboardSummary {
  settledTips: number;
  best: { room: RoomRow; roi: number; tips: number } | null;
  lastSettledAt: Date | null;
  isBacktest: boolean;
}

export async function getLeaderboardSummary(period: Period): Promise<LeaderboardSummary> {
  const rows = await getLeaderboard(period);
  const withTips = rows.filter((r) => r.stats.tips > 0);
  const best = withTips.sort((x, y) => y.stats.roi - x.stats.roi)[0];
  const [last] = await db
    .select({ settledAt: tips.settledAt })
    .from(tips)
    .where(and(eq(tips.isBacktest, period === "backtest"), ne(tips.result, "pending")))
    .orderBy(desc(tips.settledAt))
    .limit(1);
  return {
    settledTips: rows.reduce((s, r) => s + r.stats.tips, 0),
    best: best ? { room: best.room, roi: best.stats.roi, tips: best.stats.tips } : null,
    lastSettledAt: last?.settledAt ?? null,
    isBacktest: period === "backtest",
  };
}

/** Today's (and tomorrow's) pending public picks across all rooms, for the landing card. */
export async function getTodayPublicPicks(): Promise<{ count: number; first: TipView | null; publishedAt: Date | null }> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 86_400_000);
  const rows = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .innerJoin(rooms, eq(tips.roomId, rooms.id))
    .where(and(eq(tips.basis, PUBLIC_BASIS), eq(tips.isBacktest, false), eq(tips.result, "pending"), gte(fixtures.kickoffAt, start), lt(fixtures.kickoffAt, end)))
    .orderBy(fixtures.kickoffAt);
  const first = rows[0] ? toTipView(rows[0].tips, rows[0].fixtures, rows[0].rooms) : null;
  return { count: rows.length, first, publishedAt: first?.publishedAt ?? null };
}

export async function getRecentResults(roomIds: Set<string>, days = 7): Promise<{ tips: TipView[]; profit: number; wins: number; losses: number }> {
  if (roomIds.size === 0) return { tips: [], profit: 0, wins: 0, losses: 0 };
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .innerJoin(rooms, eq(tips.roomId, rooms.id))
    .where(and(inArray(tips.roomId, Array.from(roomIds)), eq(tips.basis, PUBLIC_BASIS), eq(tips.isBacktest, false), inArray(tips.result, ["win", "loss", "void"]), gte(tips.settledAt, since)))
    .orderBy(desc(tips.settledAt));
  const views = rows.map((r) => toTipView(r.tips, r.fixtures, r.rooms));
  return {
    tips: views,
    profit: views.reduce((s, t) => s + (t.profit ?? 0), 0),
    wins: views.filter((t) => t.result === "win").length,
    losses: views.filter((t) => t.result === "loss").length,
  };
}

export interface TipContext {
  modelProb: number | null;
  marketProb: number | null;
  homePpg: number | null;
  awayPpg: number | null;
  injuryFeedAvailable: boolean;
}

/** Model-vs-market and form chips for the tip page, from the analysis that produced it. */
export async function getTipContext(tipId: string): Promise<TipContext | null> {
  const { matchAnalyses } = await import("@/db/schema");
  const [row] = await db
    .select({ features: matchAnalyses.features, market: tips.market, selection: tips.selection, modelProb: tips.modelProb })
    .from(tips)
    .innerJoin(matchAnalyses, eq(tips.analysisId, matchAnalyses.id))
    .where(eq(tips.id, tipId));
  if (!row) return null;
  const f = row.features as { packet?: { implied?: { h: number; d: number; a: number; over25: number | null } | null; form?: { home?: { homePpg?: number }; away?: { awayPpg?: number } }; injuryFeedAvailable?: boolean } } | null;
  const imp = f?.packet?.implied ?? null;
  let marketProb: number | null = null;
  if (imp) {
    if (row.market === "1X2") marketProb = row.selection === "H" ? imp.h : row.selection === "D" ? imp.d : imp.a;
    else if (row.market === "OU25" && imp.over25 !== null) marketProb = row.selection === "O" ? imp.over25 : 1 - imp.over25;
  }
  return {
    modelProb: Number(row.modelProb),
    marketProb,
    homePpg: f?.packet?.form?.home?.homePpg ?? null,
    awayPpg: f?.packet?.form?.away?.awayPpg ?? null,
    injuryFeedAvailable: f?.packet?.injuryFeedAvailable ?? false,
  };
}

export async function getExpiringSubscription(userId: string, withinDays = 3) {
  const rows = await getUserSubscriptions(userId);
  const now = Date.now();
  return rows
    .filter((r) => r.active && r.sub.endsAt.getTime() - now < withinDays * 86_400_000)
    .sort((x, y) => x.sub.endsAt.getTime() - y.sub.endsAt.getTime())[0] ?? null;
}

export async function searchAll(q: string): Promise<{ rooms: RoomRow[]; tips: TipView[] }> {
  const { ilike, or } = await import("drizzle-orm");
  const term = `%${q.trim()}%`;
  if (q.trim().length < 2) return { rooms: [], tips: [] };
  const roomRows = await db.select().from(rooms).where(or(ilike(rooms.nameEn, term), ilike(rooms.slug, term), ilike(rooms.nameAm, term))!);
  const tipRows = await db
    .select()
    .from(tips)
    .innerJoin(fixtures, eq(tips.fixtureId, fixtures.id))
    .innerJoin(rooms, eq(tips.roomId, rooms.id))
    .where(and(eq(tips.basis, PUBLIC_BASIS), or(ilike(fixtures.home, term), ilike(fixtures.away, term), ilike(fixtures.leagueName, term))!))
    .orderBy(desc(tips.publishedAt))
    .limit(30);
  return { rooms: roomRows, tips: tipRows.map((r) => toTipView(r.tips, r.fixtures, r.rooms)) };
}

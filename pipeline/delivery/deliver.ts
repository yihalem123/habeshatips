/**
 * Deliver today's newly published tips: one Telegram post per tip into the room channel,
 * and one SMS per room per day to opted-in subscribers. Idempotent via the deliveries table.
 */
import crypto from "node:crypto";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { db, schema } from "../live/db";
import { PUBLIC_BASIS, type TipView } from "../../src/lib/queries";
import { sendMessage, telegramConfigured } from "../../src/lib/telegram";
import { sendSms } from "../../src/lib/sms";
import { tipHtml, tipsSms } from "./format";

async function tipsToDeliver(date: string): Promise<(TipView & { fixtureId: string })[]> {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start.getTime() + 2 * 86_400_000);
  const rows = await db
    .select()
    .from(schema.tips)
    .innerJoin(schema.fixtures, eq(schema.tips.fixtureId, schema.fixtures.id))
    .innerJoin(schema.rooms, eq(schema.tips.roomId, schema.rooms.id))
    .where(and(eq(schema.tips.basis, PUBLIC_BASIS), eq(schema.tips.isBacktest, false), eq(schema.tips.result, "pending"), gte(schema.fixtures.kickoffAt, start), lt(schema.fixtures.kickoffAt, end)));
  return rows.map(({ tips: t, fixtures: f, rooms: r }) => ({
    id: t.id,
    fixtureId: f.id,
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
    profit: null,
    publishedAt: t.publishedAt,
    hash: t.hash,
    rationaleEn: t.rationaleEn,
    rationaleAm: t.rationaleAm,
    isBacktest: false,
  }));
}

export async function deliverDate(date: string) {
  const tips = await tipsToDeliver(date);
  if (tips.length === 0) {
    console.log(`deliver ${date}: no pending tips`);
    return { telegram: 0, sms: 0 };
  }
  const roomRows = await db.select().from(schema.rooms);
  const roomById = new Map(roomRows.map((r) => [r.id, r]));

  // 1. Telegram channel posts (one per tip, once).
  let posted = 0;
  if (telegramConfigured()) {
    const already = new Set(
      (await db.select({ tipId: schema.deliveries.tipId }).from(schema.deliveries).where(and(inArray(schema.deliveries.tipId, tips.map((t) => t.id)), eq(schema.deliveries.channel, "telegram"), eq(schema.deliveries.status, "sent")))).map((d) => d.tipId),
    );
    for (const tip of tips) {
      const room = roomById.get(tip.roomId)!;
      if (!room.telegramChannelId || already.has(tip.id)) continue;
      try {
        const r = await sendMessage(room.telegramChannelId, tipHtml(tip, room.nameEn));
        await db.insert(schema.deliveries).values({ id: crypto.randomUUID(), kind: "tip", tipId: tip.id, target: room.telegramChannelId, channel: "telegram", status: "sent", providerRef: String(r.message_id ?? ""), sentAt: new Date() });
        posted++;
      } catch (err) {
        await db.insert(schema.deliveries).values({ id: crypto.randomUUID(), kind: "tip", tipId: tip.id, target: room.telegramChannelId, channel: "telegram", status: "failed", error: (err as Error).message.slice(0, 500) });
      }
    }
  }

  // 2. SMS: one message per room per subscriber per day.
  let smsSent = 0;
  const byRoom = new Map<string, TipView[]>();
  for (const t of tips) byRoom.set(t.roomId, [...(byRoom.get(t.roomId) ?? []), t]);
  for (const [roomId, roomTips] of byRoom) {
    const room = roomById.get(roomId)!;
    const subs = await db
      .select({ userId: schema.subscriptions.userId, phone: schema.users.phone, smsOptIn: schema.users.smsOptIn })
      .from(schema.subscriptions)
      .innerJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
      .where(and(eq(schema.subscriptions.roomId, roomId), eq(schema.subscriptions.status, "active"), gte(schema.subscriptions.endsAt, new Date()), eq(schema.users.smsOptIn, true)));
    const firstTip = roomTips[0];
    for (const s of subs) {
      if (!s.phone) continue;
      const dup = await db
        .select({ id: schema.deliveries.id })
        .from(schema.deliveries)
        .where(and(eq(schema.deliveries.userId, s.userId), eq(schema.deliveries.channel, "sms"), eq(schema.deliveries.kind, "tip"), eq(schema.deliveries.tipId, firstTip.id)));
      if (dup.length > 0) continue;
      if (await sendSms(s.phone, tipsSms(room.nameEn, roomTips), { kind: "tip", userId: s.userId, tipId: firstTip.id })) smsSent++;
    }
  }
  console.log(`deliver ${date}: ${posted} telegram posts, ${smsSent} sms`);
  return { telegram: posted, sms: smsSent };
}

/** Members whose subscription lapsed are set to expired and removed from the channel. */
export async function enforceExpiry(now = new Date()) {
  const lapsed = await db
    .select()
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
    .innerJoin(schema.rooms, eq(schema.subscriptions.roomId, schema.rooms.id))
    .where(and(eq(schema.subscriptions.status, "active"), lt(schema.subscriptions.endsAt, now)));
  let removed = 0;
  for (const { subscriptions: sub, users: user, rooms: room } of lapsed) {
    await db.update(schema.subscriptions).set({ status: "expired" }).where(eq(schema.subscriptions.id, sub.id));
    // Still subscribed through another active subscription to the same room? Then keep access.
    const [other] = await db
      .select({ id: schema.subscriptions.id })
      .from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.userId, user.id), eq(schema.subscriptions.roomId, room.id), eq(schema.subscriptions.status, "active"), gte(schema.subscriptions.endsAt, now)));
    if (other || !room.telegramChannelId || !user.telegramId || !telegramConfigured()) continue;
    try {
      const { removeMember } = await import("../../src/lib/telegram");
      await removeMember(room.telegramChannelId, user.telegramId);
      removed++;
    } catch (err) {
      console.warn(`remove ${user.telegramId} from ${room.slug}: ${(err as Error).message}`);
    }
  }
  console.log(`expiry: ${lapsed.length} lapsed, ${removed} removed from channels`);
  return { lapsed: lapsed.length, removed };
}

/** Renewal reminders at 3 days and 1 day before the end, via Telegram DM and/or SMS. */
export async function sendReminders(now = new Date()) {
  const horizon = new Date(now.getTime() + 3 * 86_400_000);
  const rows = await db
    .select()
    .from(schema.subscriptions)
    .innerJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
    .innerJoin(schema.rooms, eq(schema.subscriptions.roomId, schema.rooms.id))
    .where(and(eq(schema.subscriptions.status, "active"), gte(schema.subscriptions.endsAt, now), lt(schema.subscriptions.endsAt, horizon)));
  const { reminderHtml, reminderSms } = await import("./format");
  let sent = 0;
  for (const { subscriptions: sub, users: user, rooms: room } of rows) {
    const daysLeft = Math.ceil((sub.endsAt.getTime() - now.getTime()) / 86_400_000);
    const stage = daysLeft <= 1 ? "1d" : "3d";
    const done = sub.remindersSent as string[];
    if (done.includes(stage)) continue;
    let delivered = false;
    if (user.telegramId && telegramConfigured()) {
      try {
        await sendMessage(user.telegramId, reminderHtml(room.nameEn, daysLeft));
        await db.insert(schema.deliveries).values({ id: crypto.randomUUID(), kind: "reminder", userId: user.id, channel: "telegram", status: "sent", sentAt: new Date() });
        delivered = true;
      } catch (err) {
        console.warn(`reminder dm ${user.id}: ${(err as Error).message}`);
      }
    }
    if (user.smsOptIn && user.phone) delivered = (await sendSms(user.phone, reminderSms(room.nameEn, daysLeft), { kind: "reminder", userId: user.id })) || delivered;
    await db.update(schema.subscriptions).set({ remindersSent: [...done, stage] }).where(eq(schema.subscriptions.id, sub.id));
    if (delivered) sent++;
  }
  console.log(`reminders: ${sent} sent`);
  return { sent };
}

/** Daily public post: yesterday's settled results and the leaderboard, to TELEGRAM_PUBLIC_CHANNEL_ID. */
export async function postResults(now = new Date()) {
  const channel = process.env.TELEGRAM_PUBLIC_CHANNEL_ID;
  if (!channel || !telegramConfigured()) return { posted: false };
  const since = new Date(now.getTime() - 86_400_000);
  const settled = await db
    .select()
    .from(schema.tips)
    .innerJoin(schema.fixtures, eq(schema.tips.fixtureId, schema.fixtures.id))
    .innerJoin(schema.rooms, eq(schema.tips.roomId, schema.rooms.id))
    .where(and(eq(schema.tips.basis, PUBLIC_BASIS), eq(schema.tips.isBacktest, false), inArray(schema.tips.result, ["win", "loss", "void"]), gte(schema.tips.settledAt, since)));
  if (settled.length === 0) return { posted: false };
  const { escapeHtml } = await import("../../src/lib/telegram");
  const { origin } = await import("./format");
  const lines = [`<b>Results · ${now.toISOString().slice(0, 10)}</b>`];
  for (const { tips: t, fixtures: f, rooms: r } of settled) {
    const mark = t.result === "win" ? "✅" : t.result === "loss" ? "❌" : "➖";
    lines.push(`${mark} ${escapeHtml(r.nameEn)}: ${escapeHtml(f.home)} ${f.homeGoals}-${f.awayGoals} ${escapeHtml(f.away)} · ${t.selection} @ ${Number(t.oddsAtPublish).toFixed(2)} (${Number(t.profitUnits ?? 0) >= 0 ? "+" : ""}${Number(t.profitUnits ?? 0).toFixed(2)}u)`);
  }
  lines.push(`Leaderboard: ${origin()}/leaderboard`);
  const r = await sendMessage(channel, lines.join("\n"));
  await db.insert(schema.deliveries).values({ id: crypto.randomUUID(), kind: "results", target: channel, channel: "telegram", status: "sent", providerRef: String(r.message_id ?? ""), sentAt: new Date() });
  return { posted: true };
}

// Keep isNull referenced for future filters without a lint warning.
void isNull;

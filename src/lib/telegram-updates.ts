/**
 * Handles Telegram updates (shared by the webhook route and the dev polling loop):
 * - /start <token>: links the Telegram account to the HabeshaTips user.
 * - chat_member: when someone joins a room channel through a subscription's invite link,
 *   record their Telegram id so expiry enforcement can remove them later.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms, subscriptions, users } from "@/db/schema";
import { escapeHtml, sendMessage, verifyLinkToken } from "./telegram";
import { ensureInviteLinks } from "./telegram-subscriptions";

export interface TgUpdate {
  update_id: number;
  message?: { chat: { id: number; type: string }; from?: { id: number; username?: string; first_name?: string }; text?: string };
  chat_member?: {
    chat: { id: number };
    from: { id: number };
    new_chat_member: { status: string; user: { id: number; username?: string } };
    invite_link?: { invite_link: string; name?: string };
  };
}

export async function handleUpdate(u: TgUpdate) {
  if (u.message?.text?.startsWith("/start") && u.message.from) {
    const token = u.message.text.split(/\s+/)[1];
    const chatId = u.message.chat.id;
    const userId = token ? verifyLinkToken(token) : null;
    if (!userId) {
      await sendMessage(chatId, "Open your HabeshaTips dashboard and tap <b>Connect Telegram</b> to link this account.");
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;
    await db.update(users).set({ telegramId: String(u.message.from.id), telegramUsername: u.message.from.username ?? null }).where(eq(users.id, userId));
    const links = await ensureInviteLinks(userId);
    const lines = [`Linked. Your rooms:`];
    for (const l of links) lines.push(`• <b>${escapeHtml(l.roomName)}</b>: ${l.link ? `<a href="${l.link}">join channel</a>` : "channel not set up yet"}`);
    if (links.length === 1 && lines.length === 1) lines.push("No active rooms. Subscribe on the website and your invite links will appear here.");
    await sendMessage(chatId, lines.join("\n"));
    return;
  }

  const cm = u.chat_member;
  if (cm && ["member", "administrator"].includes(cm.new_chat_member.status) && cm.invite_link) {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.telegramInviteLink, cm.invite_link.invite_link));
    if (!sub) return;
    const tgId = String(cm.new_chat_member.user.id);
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, sub.roomId), eq(rooms.telegramChannelId, String(cm.chat.id))));
    if (!room) return;
    await db.update(users).set({ telegramId: tgId, telegramUsername: cm.new_chat_member.user.username ?? null }).where(eq(users.id, sub.userId));
  }
}

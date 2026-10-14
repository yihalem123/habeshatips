/**
 * Thin Telegram Bot API client (no SDK). TELEGRAM_BOT_TOKEN from BotFather; the bot must be
 * an admin in every room channel (invite links, removing members) and in the public channel.
 * TELEGRAM_MOCK=1 logs calls instead of sending.
 */
import crypto from "node:crypto";

const API = "https://api.telegram.org";

export function telegramConfigured() {
  return !!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_MOCK === "1";
}

export async function tg<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (process.env.TELEGRAM_MOCK === "1") {
    console.log(`[telegram:mock] ${method} ${JSON.stringify(params).slice(0, 300)}`);
    if (method === "createChatInviteLink") return { invite_link: `https://t.me/+mock${crypto.randomBytes(4).toString("hex")}` } as T;
    if (method === "getMe") return { username: "HabeshaTipsBot" } as T;
    return { ok: true } as T;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!body.ok) throw new Error(`telegram ${method}: ${body.description ?? res.status}`);
  return body.result as T;
}

export async function sendMessage(chatId: string | number, html: string, extra: Record<string, unknown> = {}) {
  return tg<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...extra,
  });
}

/** One-member invite link, named after the subscription so joins can be traced back. */
export async function createInviteLink(channelId: string, name: string, expiresInSeconds = 7 * 86_400) {
  const r = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: channelId,
    name: name.slice(0, 32),
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  return r.invite_link;
}

/** Remove a member but let them re-join later with a fresh link (ban + unban). */
export async function removeMember(channelId: string, telegramUserId: string | number) {
  await tg("banChatMember", { chat_id: channelId, user_id: Number(telegramUserId) });
  await tg("unbanChatMember", { chat_id: channelId, user_id: Number(telegramUserId), only_if_banned: true });
}

export async function botUsername(): Promise<string> {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME;
  const me = await tg<{ username: string }>("getMe");
  return me.username;
}

// ---- Account linking: deep link payload = <userId>_<hmac16> ---------------------------

function linkSecret() {
  return process.env.SESSION_SECRET ?? "dev-secret-change-me";
}

export function linkToken(userId: string): string {
  const sig = crypto.createHmac("sha256", linkSecret()).update(`tg:${userId}`).digest("base64url").slice(0, 16);
  return `${userId}_${sig}`;
}

export function verifyLinkToken(token: string): string | null {
  const i = token.lastIndexOf("_");
  if (i <= 0) return null;
  const userId = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac("sha256", linkSecret()).update(`tg:${userId}`).digest("base64url").slice(0, 16);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return userId;
}

export async function linkUrl(userId: string): Promise<string> {
  return `https://t.me/${await botUsername()}?start=${linkToken(userId)}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

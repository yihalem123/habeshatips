/**
 * SMS delivery. Providers plug in here; Ethiopia only allows one-way SMS, so nothing expects replies.
 * - afromessage: Ethio Telecom-backed gateway (AFROMESSAGE_TOKEN, AFROMESSAGE_IDENTIFIER, AFROMESSAGE_SENDER)
 * - console: development fallback that logs the message
 */
import crypto from "node:crypto";
import { db } from "@/db";
import { deliveries } from "@/db/schema";

export interface SmsProvider {
  name: string;
  send(to: string, text: string): Promise<{ providerRef: string | null }>;
}

const consoleProvider: SmsProvider = {
  name: "console",
  async send(to, text) {
    console.log(`[sms:console] ${to}: ${text}`);
    return { providerRef: null };
  },
};

/** POST https://api.afromessage.com/api/send with a JSON body, Bearer token; matches the official SDK. */
const afroMessage: SmsProvider = {
  name: "afromessage",
  async send(to, text) {
    const payload: Record<string, string> = { to: to.replace(/^\+/, ""), message: text };
    if (process.env.AFROMESSAGE_SENDER) payload.sender = process.env.AFROMESSAGE_SENDER;
    if (process.env.AFROMESSAGE_IDENTIFIER) payload.from = process.env.AFROMESSAGE_IDENTIFIER;
    const res = await fetch("https://api.afromessage.com/api/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AFROMESSAGE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.json().catch(() => ({}))) as { acknowledge?: string; response?: { status?: string; message_id?: string; errors?: unknown } };
    if (!res.ok || body.acknowledge !== "success") throw new Error(`afromessage: ${res.status} ${JSON.stringify(body.response ?? body).slice(0, 200)}`);
    return { providerRef: body.response?.message_id ?? null };
  },
};

export function smsProvider(): SmsProvider {
  if (process.env.AFROMESSAGE_TOKEN && process.env.SMS_MOCK !== "1") return afroMessage;
  return consoleProvider;
}

export function smsConfigured() {
  return smsProvider().name !== "console";
}

export type DeliveryKind = "tip" | "otp" | "reminder" | "results" | "link";

/** Send and log. Never throws: a failed SMS is recorded, not fatal. */
export async function sendSms(to: string, text: string, meta: { kind: DeliveryKind; userId?: string | null; tipId?: string | null }) {
  const id = crypto.randomUUID();
  try {
    const r = await smsProvider().send(to, text);
    await db.insert(deliveries).values({ id, kind: meta.kind, tipId: meta.tipId ?? null, userId: meta.userId ?? null, channel: "sms", status: "sent", providerRef: r.providerRef, sentAt: new Date() });
    return true;
  } catch (err) {
    await db.insert(deliveries).values({ id, kind: meta.kind, tipId: meta.tipId ?? null, userId: meta.userId ?? null, channel: "sms", status: "failed", error: (err as Error).message.slice(0, 500) });
    console.warn(`sms to ${to} failed: ${(err as Error).message}`);
    return false;
  }
}

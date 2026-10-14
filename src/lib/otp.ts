import crypto from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes, users } from "@/db/schema";
import { sendSms } from "./sms";

/** Normalise Ethiopian numbers to E.164 (+2519..., +2517...). Accepts 09..., 07..., 2519..., +2519... */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits;
  if (n.startsWith("0") && n.length === 10) n = "251" + n.slice(1);
  if (n.length === 9 && (n.startsWith("9") || n.startsWith("7"))) n = "251" + n;
  if (!/^\d{10,15}$/.test(n)) return null;
  return "+" + n;
}

function hash(code: string, phone: string) {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

const smsSender: OtpSender = {
  async send(phone, code) {
    await sendSms(phone, `HabeshaTips code: ${code}. Valid for 10 minutes. ኮድ፡ ${code}`, { kind: "otp" });
  },
};

function sender(): OtpSender {
  return smsSender; // console provider in development, AfroMessage when configured
}

export async function requestOtp(phoneRaw: string): Promise<{ phone: string; devCode?: string } | null> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;
  const [recent] = await db.select().from(otpCodes).where(eq(otpCodes.phone, phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (recent && Date.now() - recent.createdAt.getTime() < 30_000) return { phone };
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({
    id: crypto.randomUUID(),
    phone,
    codeHash: hash(code, phone),
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });
  await sender().send(phone, code);
  const devCode = process.env.NODE_ENV !== "production" && process.env.OTP_DEV_SHOW === "1" ? code : undefined;
  return { phone, devCode };
}

export async function verifyOtp(phoneRaw: string, code: string): Promise<string | null> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) return null;
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt < new Date() || row.attempts >= 5) return null;
  if (row.codeHash !== hash(code.trim(), phone)) {
    await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
    return null;
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  const [existing] = await db.select().from(users).where(eq(users.phone, phone));
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, phone });
  return id;
}

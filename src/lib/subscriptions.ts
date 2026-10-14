import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, payments, subscriptions } from "@/db/schema";


/** Mark a payment successful (idempotent) and start or extend the room subscription by 30 days. */
export async function activateFromPayment(paymentId: string, roomId: string, raw?: unknown, days = 30) {
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p) throw new Error("payment not found");
  if (p.status !== "success") {
    await db.update(payments).set({ status: "success", verifiedAt: new Date(), rawWebhook: raw ?? p.rawWebhook }).where(eq(payments.id, paymentId));
  }
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, p.userId), eq(subscriptions.roomId, roomId), eq(subscriptions.paymentId, paymentId)));
  if (existing) return existing;

  const [current] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, p.userId), eq(subscriptions.roomId, roomId), eq(subscriptions.status, "active")));
  const base = current && current.endsAt > new Date() ? current.endsAt : new Date();
  const endsAt = new Date(base.getTime() + days * 86_400_000);
  if (current) await db.update(subscriptions).set({ status: "expired" }).where(eq(subscriptions.id, current.id));
  const [sub] = await db
    .insert(subscriptions)
    .values({ id: crypto.randomUUID(), userId: p.userId, roomId, paymentId, startsAt: new Date(), endsAt, status: "active" })
    .returning();
  await db.insert(auditLog).values({ id: crypto.randomUUID(), actorId: p.userId, action: "subscription.activate", entity: "subscription", entityId: sub.id, details: { paymentId, roomId, endsAt, days } });
  return sub;
}

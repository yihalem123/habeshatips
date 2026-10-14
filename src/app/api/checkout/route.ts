import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, rooms } from "@/db/schema";
import { chapaConfigured, initializePayment } from "@/lib/chapa";
import { getCurrentUser } from "@/lib/session";
import { activateFromPayment } from "@/lib/subscriptions";

import { planPrice } from "@/lib/plans";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const plan = String(form.get("plan") ?? "30") === "90" ? 90 : 30;
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, slug));
  if (!room || !room.active) return NextResponse.json({ error: "room not found" }, { status: 404 });
  if (room.priceEtb <= 0 && chapaConfigured()) return NextResponse.json({ error: "room has no price yet" }, { status: 400 });
  const amountEtb = planPrice(room.priceEtb, plan);

  const txRef = `ht-${room.slug}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    userId: user.id,
    provider: chapaConfigured() ? "chapa" : "manual",
    txRef,
    amountEtb,
    status: "initiated",
    rawWebhook: { roomId: room.id, days: plan },
  });

  if (!chapaConfigured()) {
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "payments not configured" }, { status: 503 });
    await activateFromPayment(paymentId, room.id, { dev: true, roomId: room.id, days: plan }, plan);
    return NextResponse.redirect(new URL(`/checkout/return?tx_ref=${txRef}`, req.url), 303);
  }

  const origin = process.env.PUBLIC_ORIGIN ?? new URL(req.url).origin;
  const checkoutUrl = await initializePayment({
    txRef,
    amountEtb,
    phone: user.phone,
    email: user.email,
    firstName: "HabeshaTips",
    lastName: "Member",
    returnUrl: `${origin}/checkout/return?tx_ref=${txRef}`,
    callbackUrl: `${origin}/api/webhooks/chapa`,
    title: room.nameEn,
    description: `${plan}-day room subscription`,
  });
  return NextResponse.redirect(checkoutUrl, 303);
}

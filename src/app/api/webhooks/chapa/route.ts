import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { verifyPayment, verifyWebhookSignature } from "@/lib/chapa";
import { activateFromPayment } from "@/lib/subscriptions";

/**
 * Chapa calls the `callback_url` with a GET (trx_ref, ref_id, status) when a payment completes.
 * Nothing in that request is trusted: the transaction is re-verified against Chapa's API.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const txRef = url.searchParams.get("trx_ref") ?? url.searchParams.get("tx_ref");
  if (!txRef) return NextResponse.json({ ok: true });
  await settleByVerification(txRef, { callback: Object.fromEntries(url.searchParams) });
  return NextResponse.json({ ok: true });
}

async function settleByVerification(txRef: string, context: Record<string, unknown>) {
  const [p] = await db.select().from(payments).where(eq(payments.txRef, txRef));
  if (!p || p.status === "success") return;
  const meta = p.rawWebhook as { roomId?: string; days?: number } | null;
  const roomId = meta?.roomId;
  const days = meta?.days === 90 ? 90 : 30;
  const v = await verifyPayment(txRef);
  if (v.success && Math.round(v.amount) >= p.amountEtb) {
    if (roomId) await activateFromPayment(p.id, roomId, { ...context, verify: v.raw, roomId, days }, days);
  } else if ((v.raw as { data?: { status?: string } })?.data?.status === "failed") {
    await db.update(payments).set({ status: "failed", rawWebhook: { ...context, verify: v.raw, roomId } }).where(eq(payments.id, p.id));
  }
}

/** Chapa posts signed webhook events here (Dashboard → Settings → Webhooks). Verified, then re-checked via the API. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  let body: { tx_ref?: string; status?: string; event?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const txRef = body.tx_ref;
  if (!txRef) return NextResponse.json({ ok: true });
  await settleByVerification(txRef, { webhook: body });
  return NextResponse.json({ ok: true });
}

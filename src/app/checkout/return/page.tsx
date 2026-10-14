import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { chapaConfigured, verifyPayment } from "@/lib/chapa";
import { activateFromPayment } from "@/lib/subscriptions";

export const metadata = { title: "Payment" };

export default async function CheckoutReturn({ searchParams }: { searchParams: Promise<{ tx_ref?: string }> }) {
  const { tx_ref } = await searchParams;
  let ok = false;
  let message = "Missing payment reference.";
  if (tx_ref) {
    const [p] = await db.select().from(payments).where(eq(payments.txRef, tx_ref));
    if (!p) message = "Unknown payment reference.";
    else if (p.status === "success") {
      ok = true;
      message = "Payment confirmed.";
    } else if (chapaConfigured()) {
      const v = await verifyPayment(tx_ref);
      if (v.success && Math.round(v.amount) >= p.amountEtb) {
        const roomId = (p.rawWebhook as { roomId?: string } | null)?.roomId;
        if (roomId) await activateFromPayment(p.id, roomId, v.raw);
        ok = true;
        message = "Payment confirmed.";
      } else {
        message = "Payment not confirmed yet. If you paid, it will activate within a few minutes.";
      }
    }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className={`num text-5xl ${ok ? "text-up" : "text-gold"}`}>{ok ? "✓" : "…"}</div>
      <h1 className="font-display mt-4 text-2xl font-semibold">{message}</h1>
      <Link href="/dashboard" className="mt-6 inline-block rounded bg-gold px-4 py-2 font-medium text-black hover:bg-gold-2">
        Dashboard →
      </Link>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

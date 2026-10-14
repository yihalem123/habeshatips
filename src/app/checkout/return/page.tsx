import { Button } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";
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
        const meta = p.rawWebhook as { roomId?: string; days?: number } | null;
        const days = meta?.days === 90 ? 90 : 30;
        if (meta?.roomId) await activateFromPayment(p.id, meta.roomId, { verify: v.raw, roomId: meta.roomId, days }, days);
        ok = true;
        message = "Payment confirmed.";
      } else {
        message = "Payment not confirmed yet. If you paid, it will activate within a few minutes.";
      }
    }
  }
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${ok ? "bg-green text-on-green" : "bg-surface-3 text-amber"} text-2xl font-extrabold`}>{ok ? "✓" : "…"}</div>
      <h1 className="mt-5 text-[24px] font-extrabold tracking-tight">{ok ? t(locale, "paymentConfirmed") : message}</h1>
      <Button href="/dashboard" className="mt-6">{t(locale, "dashboard")} →</Button>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

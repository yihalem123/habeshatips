import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { chapaConfigured } from "@/lib/chapa";
import { getLocale, pick, t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);
  const locale = await getLocale();
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, slug));
  if (!room) notFound();
  const dev = !chapaConfigured();
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-semibold">{t(locale, "subscribe")}</h1>
      <div className="mt-6 rounded-lg border border-line bg-surface p-5">
        <div className="font-display text-xl font-semibold">{pick(locale, room.nameEn, room.nameAm)}</div>
        <div className="num mt-2 text-3xl">
          {room.priceEtb} ETB <span className="text-base text-muted">/ 30 days</span>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-ink-2">
          <li>· Telebirr, CBE Birr, M-Pesa and cards via Chapa</li>
          <li>· No automatic renewal</li>
        </ul>
        <form method="post" action="/api/checkout" className="mt-6">
          <input type="hidden" name="slug" value={room.slug} />
          <button className="w-full rounded bg-gold px-4 py-2.5 font-medium text-black hover:bg-gold-2">
            {dev ? "Activate (development)" : "Pay with Chapa"}
          </button>
        </form>
        {dev && <p className="mt-3 text-xs text-muted">CHAPA_SECRET_KEY is not set: this activates the subscription without payment. Development only.</p>}
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

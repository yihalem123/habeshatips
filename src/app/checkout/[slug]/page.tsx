import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { IconChevron } from "@/components/icons";
import { Button, Chip, Eyebrow, RoomMark } from "@/components/ui";
import { chapaConfigured } from "@/lib/chapa";
import { fmtDate } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { planPrice } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";
import { roomMarkets } from "@/lib/rooms-meta";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { slug } = await params;
  const { plan: planParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);
  const locale = await getLocale();
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, slug));
  if (!room) notFound();
  const plan = planParam === "90" ? 90 : 30;
  const price = planPrice(room.priceEtb, plan);
  const dev = !chapaConfigured();
  const start = new Date();
  const end = new Date(start.getTime() + plan * 86_400_000);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <Link href="/rooms" className="hover:text-ink">{t(locale, "rooms")}</Link>
        <IconChevron size={14} />
        <Link href={`/rooms/${room.slug}`} className="hover:text-ink">{room.nameEn}</Link>
        <IconChevron size={14} />
        <span className="text-ink-2">Checkout</span>
      </div>
      <h1 className="text-[28px] font-extrabold tracking-tight">{t(locale, "subscribeTo", { room: pick(locale, room.nameEn, room.nameAm) })}</h1>

      <form method="post" action="/api/checkout" className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <input type="hidden" name="slug" value={room.slug} />
        <input type="hidden" name="plan" value={plan} />
        <div className="space-y-4">
          <div className="card p-5">
            <Eyebrow>{t(locale, "plan")}</Eyebrow>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([30, 90] as const).map((d) => {
                const active = d === plan;
                return (
                  <Link
                    key={d}
                    href={`/checkout/${room.slug}?plan=${d}`}
                    className={`relative rounded-xl border p-4 ${active ? "border-green bg-green/[0.05]" : "border-white/10 hover:border-white/20"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-extrabold">{d === 30 ? t(locale, "days30") : t(locale, "days90")}</span>
                      {d === 90 ? <Chip tone="green">{t(locale, "save15")}</Chip> : active ? <span className="h-2.5 w-2.5 rounded-full bg-green" /> : null}
                    </div>
                    <div className="num mt-2 text-[24px] font-bold">
                      {planPrice(room.priceEtb, d)} <span className="text-[13px] font-medium text-muted">ETB</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="card p-5">
            <Eyebrow>{t(locale, "payWith")}</Eyebrow>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Telebirr", "CBE Birr", "M-Pesa", "Card"].map((m, i) => (
                <span key={m} className={`rounded-[10px] border px-4 py-2 text-[13px] font-bold ${i === 0 ? "border-green text-green" : "border-white/10 text-ink-2"}`}>{m}</span>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{t(locale, "chapaNote")}</p>
          </div>
          <label className="flex items-start gap-3 px-1 text-[12.5px] text-ink-2">
            <input type="checkbox" required className="mt-0.5 accent-green" /> {t(locale, "iAm18")}
          </label>
        </div>

        <aside className="card h-fit p-5">
          <div className="flex items-center gap-3">
            <RoomMark slug={room.slug} size={36} />
            <div>
              <div className="text-[15px] font-extrabold">{pick(locale, room.nameEn, room.nameAm)}</div>
              <div className="text-[12px] text-muted">{roomMarkets(room.strategyConfig)} · {t(locale, "aiStrategy")}</div>
            </div>
          </div>
          <dl className="num mt-5 space-y-2 border-t border-white/[0.06] pt-4 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted">{t(locale, "dayAccess", { n: plan })}</dt><dd>{price.toFixed(2)} ETB</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t(locale, "starts")}</dt><dd>{fmtDate(start, locale)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t(locale, "ends")}</dt><dd>{fmtDate(end, locale)}</dd></div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-white/[0.06] pt-4">
            <span className="text-[13px] font-bold text-muted">{t(locale, "total")}</span>
            <span className="num text-[26px] font-bold">
              {price} <span className="text-[13px] font-medium text-muted">ETB</span>
            </span>
          </div>
          <Button size="lg" className="mt-4 w-full">{dev ? t(locale, "activateDev") : t(locale, "payWithChapa", { price })}</Button>
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted">{t(locale, "noAutoRenew")}</p>
          {dev && <p className="mt-2 text-[11px] text-amber">CHAPA_SECRET_KEY is not set: development activation only.</p>}
        </aside>
      </form>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevron } from "@/components/icons";
import { EquityChart } from "@/components/sparkline";
import { PickCard, ResultRow } from "@/components/tip-views";
import { Button, Chip, Eyebrow, KV, RoomMark, SectionTitle, StatCard } from "@/components/ui";
import { fmtPct, fmtRate, fmtTime, fmtUnits } from "@/lib/format";
import { getLocale, t } from "@/lib/i18n";
import { activeRoomIds, canViewTip, getRoomBySlug, roomStatsFromTips } from "@/lib/queries";
import { roomMarkets, roomMaxPerDay, roomRules } from "@/lib/rooms-meta";
import { getSessionUserId } from "@/lib/session";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, detail, uid] = await Promise.all([getLocale(), getRoomBySlug(slug), getSessionUserId()]);
  if (!detail) notFound();
  const subscribed = await activeRoomIds(uid);
  const isSub = subscribed.has(detail.room.id);
  const isBacktest = detail.live.tips === 0;
  const stats = await roomStatsFromTips(detail.room.id, isBacktest);
  const tone = stats.tips === 0 ? "muted" : stats.roi > 0 ? "green" : stats.roi < 0 ? "red" : "ink";
  const maxPerDay = roomMaxPerDay(detail.room.strategyConfig);
  const labels = detail.equityIsBacktest ? ["Aug 25", "Nov", "Feb 26", "May 26"] : ["start", "", "", "now"];
  const published = detail.upcomingTips[0]?.publishedAt;

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-4 flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <Link href="/rooms" className="hover:text-ink">{t(locale, "rooms")}</Link>
        <IconChevron size={14} />
        <span className="text-ink-2">{detail.room.nameEn}</span>
      </div>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <RoomMark slug={detail.room.slug} size={40} />
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="green">{t(locale, "aiStrategy")}</Chip>
              <span className="text-[12.5px] text-muted">{roomMarkets(detail.room.strategyConfig)} · {t(locale, "maxPerDay", { n: maxPerDay })}</span>
            </div>
          </div>
          <h1 className="mt-4 text-[34px] font-extrabold leading-tight tracking-tight">
            {detail.room.nameEn} <span className="ml-2 text-[20px] font-semibold text-muted">{detail.room.nameAm}</span>
          </h1>
          <p className="mt-3 max-w-[640px] text-[15px] leading-relaxed text-ink-2">{detail.room.persona}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t(locale, "roi")} value={stats.tips ? fmtPct(stats.roi) : "—"} sub={isBacktest ? "backtest 25/26" : t(locale, "period_all")} tone={tone === "ink" ? "ink" : tone} />
            <StatCard label={t(locale, "profit")} value={stats.tips ? `${fmtUnits(stats.profit)}u` : "—"} sub="flat 1-unit stakes" tone={tone === "ink" ? "ink" : tone} />
            <StatCard label={t(locale, "winRate")} value={stats.tips ? fmtRate(stats.winRate) : "—"} sub={stats.tips ? `avg odds ${stats.avgOdds.toFixed(2)}` : undefined} />
            <StatCard label={t(locale, "tips")} value={String(stats.tips)} sub={stats.tips ? `max drawdown ${stats.maxDrawdown.toFixed(1)}u` : undefined} />
          </div>

          <div className="card mt-4 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-extrabold">
                {t(locale, "equityCurve")} <span className="ml-1 text-[12px] font-medium text-muted">{t(locale, "unitsCumulative")}</span>
              </div>
              <Chip tone={detail.equityIsBacktest ? "muted" : "green"}>{detail.equityIsBacktest ? "Season 25/26" : "Live"}</Chip>
            </div>
            <div className="mt-4">
              <EquityChart points={detail.equity} labels={labels} />
            </div>
          </div>

          <section className="mt-8">
            <SectionTitle
              title={t(locale, "todaysPicks")}
              sub={`${detail.upcomingTips.length} ${t(locale, "ofMax", { n: maxPerDay })}`}
              action={published ? <span className="num text-[12px] text-muted">{t(locale, "published")} {fmtTime(published)} EAT</span> : undefined}
            />
            {detail.upcomingTips.length === 0 ? (
              <div className="card px-5 py-6 text-[13px] text-muted">{t(locale, "noPicksYet")}</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {detail.upcomingTips.map((tip) => (
                  <PickCard key={tip.id} tip={tip} locale={locale} locked={!canViewTip(tip, subscribed)} showRoom={false} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <SectionTitle title={t(locale, "recentResults")} action={<span className="text-[12.5px] font-bold text-muted">{t(locale, "all")} {stats.tips}</span>} />
            <div className="card p-1.5">
              {detail.recentTips.length === 0 ? (
                <div className="px-4 py-5 text-[13px] text-muted">—</div>
              ) : (
                detail.recentTips.slice(0, 12).map((tip) => <ResultRow key={tip.id} tip={tip} locale={locale} />)
              )}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <Eyebrow>{t(locale, "monthlyAccess")}</Eyebrow>
            <div className="num mt-2 text-[30px] font-bold leading-none">
              {detail.room.priceEtb} <span className="text-[15px] font-medium text-muted">ETB {t(locale, "perDays")}</span>
            </div>
            <ul className="mt-4 space-y-2 text-[13px] text-ink-2">
              {(["bullet1", "bullet2", "bullet3", "bullet4"] as const).map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="text-green">✓</span> {t(locale, k)}
                </li>
              ))}
            </ul>
            {isSub ? (
              <Button href="/dashboard" variant="outline" size="lg" className="mt-5 w-full">{t(locale, "dashboard")} →</Button>
            ) : (
              <Button href={`/checkout/${detail.room.slug}`} size="lg" className="mt-5 w-full">{t(locale, "subscribe")}</Button>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Telebirr", "CBE Birr", "M-Pesa", "Card"].map((m) => (
                <span key={m} className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] font-semibold text-muted">{m}</span>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <Eyebrow>{t(locale, "howRoomDecides")}</Eyebrow>
            <div className="mt-2 divide-y divide-white/[0.06]">
              {roomRules(detail.room.strategyConfig).map((r) => (
                <KV key={r.label} k={r.label} v={r.value} />
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">{t(locale, "decidesNote")}</p>
          </div>
          <p className="px-1 text-[11.5px] leading-relaxed text-muted">{t(locale, "responsible")}</p>
        </aside>
      </div>
      {!isSub && (
        <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-white/[0.08] bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
          <Button href={`/checkout/${detail.room.slug}`} size="lg" className="w-full">
            {t(locale, "subscribe")} · {detail.room.priceEtb} ETB
          </Button>
        </div>
      )}
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

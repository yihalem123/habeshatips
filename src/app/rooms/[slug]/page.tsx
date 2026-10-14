import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkline } from "@/components/sparkline";
import { Pill, Stat } from "@/components/stat";
import { TipCard } from "@/components/tip-card";
import { fmtPct, fmtRate, fmtUnits } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { activeRoomIds, canViewTip, getRoomBySlug } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, detail, uid] = await Promise.all([getLocale(), getRoomBySlug(slug), getSessionUserId()]);
  if (!detail) notFound();
  const subscribed = await activeRoomIds(uid);
  const isSub = subscribed.has(detail.room.id);
  const cfg = detail.room.strategyConfig as { markets?: string[]; maxTipsPerDay?: number };
  const shown = detail.live.tips > 0 ? detail.live : detail.backtest;
  const shownLabel = detail.live.tips > 0 ? t(locale, "period_all") : t(locale, "period_backtest");
  const tone = shown.tips === 0 ? "neutral" : shown.roi > 0 ? "up" : shown.roi < 0 ? "down" : "neutral";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Pill tone="gold">{t(locale, "aiLabel")}</Pill>
            <span className="text-xs text-muted">{cfg.markets?.join(" · ")} · max {cfg.maxTipsPerDay}/day</span>
          </div>
          <h1 className="font-display mt-3 text-4xl font-semibold">{pick(locale, detail.room.nameEn, detail.room.nameAm)}</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-2">{detail.room.persona}</p>

          <div className="mt-8 rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{shownLabel}</span>
              {detail.equityIsBacktest && <Pill>{t(locale, "period_backtest")}</Pill>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label={t(locale, "roi")} value={shown.tips ? fmtPct(shown.roi) : "—"} tone={tone} />
              <Stat label={t(locale, "profit")} value={shown.tips ? fmtUnits(shown.profit) : "—"} tone={tone} sub={t(locale, "units")} />
              <Stat label={t(locale, "winRate")} value={shown.tips ? fmtRate(shown.winRate) : "—"} />
              <Stat label={t(locale, "tips")} value={String(shown.tips)} />
            </div>
            <div className="mt-6 overflow-hidden">
              <Sparkline points={detail.equity} width={760} height={120} className="h-[120px] w-full" />
            </div>
            <p className="mt-3 text-xs text-muted">{detail.equityIsBacktest ? t(locale, "backtestNote") : t(locale, "liveStartsNote")}</p>
          </div>

          {detail.upcomingTips.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display mb-3 text-xl font-semibold">{t(locale, "todayTips")}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {detail.upcomingTips.map((tip) => (
                  <TipCard key={tip.id} tip={tip} locale={locale} locked={!canViewTip(tip, subscribed)} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display mb-3 text-xl font-semibold">{t(locale, "recentTips")}</h2>
            {detail.recentTips.length === 0 ? (
              <p className="text-sm text-muted">{t(locale, "noLiveYet")}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {detail.recentTips.map((tip) => (
                  <TipCard key={tip.id} tip={tip} locale={locale} locked={false} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted">{t(locale, "pricing")}</div>
            <div className="num mt-2 text-3xl font-medium">
              {detail.room.priceEtb > 0 ? `${detail.room.priceEtb} ETB` : "—"} <span className="text-base text-muted">{t(locale, "perMonth")}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-ink-2">
              <li>· Picks before kickoff, with the written analysis in English and Amharic</li>
              <li>· Telegram channel access (coming)</li>
              <li>· Cancel any time; no auto-renewal</li>
            </ul>
            {isSub ? (
              <Link href="/dashboard" className="mt-5 block rounded bg-surface-2 px-4 py-2.5 text-center text-ink hover:bg-line">
                {t(locale, "dashboard")} →
              </Link>
            ) : (
              <Link href={`/checkout/${detail.room.slug}`} className="mt-5 block rounded bg-gold px-4 py-2.5 text-center font-medium text-black hover:bg-gold-2">
                {t(locale, "subscribe")}
              </Link>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted">{t(locale, "responsible")}</p>
          </div>
          <div className="mt-4 rounded-lg border border-line p-5 text-sm text-ink-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted">{t(locale, "strategy")}</div>
            <p className="mt-2 leading-relaxed">
              Decisions use a goal model blended 80/20 with bookmaker prices. Tips need a minimum of evidence on both teams and a minimum expected value at the quoted odds. No pick on a day is a valid output.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

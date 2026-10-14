import Link from "next/link";
import { notFound } from "next/navigation";
import { ResultPill } from "@/components/tip-card";
import { Pill, Stat } from "@/components/stat";
import { fmtDate, fmtDateTimeIso, fmtOdds, MARKET_LABEL, selectionLabel } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { activeRoomIds, canViewTip, getTip } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";

export default async function TipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, tip, uid] = await Promise.all([getLocale(), getTip(id), getSessionUserId()]);
  if (!tip) notFound();
  const subscribed = await activeRoomIds(uid);
  const visible = canViewTip(tip, subscribed);
  const score = tip.homeGoals !== null && tip.awayGoals !== null ? `${tip.homeGoals}–${tip.awayGoals}` : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href={`/rooms/${tip.roomSlug}`} className="hover:text-ink">{pick(locale, tip.roomNameEn, tip.roomNameAm)}</Link>
        <span>/</span>
        <span>{tip.leagueName}</span>
        {tip.isBacktest && <Pill>{t(locale, "period_backtest")}</Pill>}
      </div>
      <h1 className="font-display mt-3 text-3xl font-semibold md:text-4xl">
        {tip.home} <span className="text-muted">v</span> {tip.away}
        {score && <span className="num ml-3 text-2xl text-ink-2">{score}</span>}
      </h1>
      <div className="mt-2 text-sm text-ink-2">
        {t(locale, "kickoff")}: {fmtDate(tip.kickoffAt, locale, true)} · <ResultPill result={tip.result} locale={locale} />
      </div>

      <div className="mt-8 rounded-lg border border-line bg-surface p-5">
        {visible ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label={t(locale, "market")} value={MARKET_LABEL[tip.market]} mono={false} />
            <Stat label={t(locale, "selection")} value={selectionLabel(tip.market, tip.selection, tip.home, tip.away)} tone="gold" mono={false} />
            <Stat label={t(locale, "odds")} value={fmtOdds(tip.odds)} />
            <Stat label={t(locale, "result")} value={tip.profit === null ? "—" : `${tip.profit >= 0 ? "+" : ""}${tip.profit.toFixed(2)}u`} tone={tip.profit === null ? "neutral" : tip.profit >= 0 ? "up" : "down"} />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-ink-2">{t(locale, "locked")}.</p>
            <Link href={`/checkout/${tip.roomSlug}`} className="rounded bg-gold px-4 py-2 font-medium text-black hover:bg-gold-2">
              {t(locale, "subscribe")}
            </Link>
          </div>
        )}
      </div>

      {visible && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">{t(locale, "analysis")}</h2>
          <div className="prose-sm mt-3 whitespace-pre-line leading-relaxed text-ink-2">{pick(locale, tip.rationaleEn, tip.rationaleAm)}</div>
        </section>
      )}

      <section className="mt-10 rounded-lg border border-line bg-bg-2 p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted">{t(locale, "verified")}</h2>
        <dl className="num mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">{t(locale, "published")}</dt><dd>{fmtDateTimeIso(tip.publishedAt)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{t(locale, "kickoff")}</dt><dd>{fmtDateTimeIso(tip.kickoffAt)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">{t(locale, "hash")}</dt><dd className="break-all text-right text-xs text-ink-2">{tip.hash}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          The hash is SHA-256 over room, fixture, market, pick, odds, basis and the publish timestamp. The record cannot be edited; corrections create a new tip that references this one.
        </p>
      </section>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

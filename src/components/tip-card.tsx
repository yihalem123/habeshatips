import Link from "next/link";
import { fmtDate, fmtOdds, MARKET_LABEL, selectionLabel } from "@/lib/format";
import { pick, t, type Locale } from "@/lib/i18n";
import type { TipView } from "@/lib/queries";
import { Pill } from "./stat";

export function ResultPill({ result, locale }: { result: string; locale: Locale }) {
  if (result === "win") return <Pill tone="up">{t(locale, "win")}</Pill>;
  if (result === "loss") return <Pill tone="down">{t(locale, "loss")}</Pill>;
  if (result === "void") return <Pill>{t(locale, "void")}</Pill>;
  return <Pill>{t(locale, "pending")}</Pill>;
}

export function TipCard({ tip, locale, locked }: { tip: TipView; locale: Locale; locked: boolean }) {
  const score = tip.homeGoals !== null && tip.awayGoals !== null ? `${tip.homeGoals}–${tip.awayGoals}` : null;
  return (
    <Link href={`/tips/${tip.id}`} className="block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {tip.leagueName} · {fmtDate(tip.kickoffAt, locale, true)}
        </span>
        <span className="flex items-center gap-2">
          {tip.isBacktest && <Pill>{t(locale, "period_backtest")}</Pill>}
          <ResultPill result={tip.result} locale={locale} />
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="font-display text-lg font-semibold">
          {tip.home} <span className="text-muted">v</span> {tip.away}
          {score && <span className="num ml-2 text-base text-ink-2">{score}</span>}
        </div>
        <div className="num text-lg text-ink">{locked ? "•••" : fmtOdds(tip.odds)}</div>
      </div>
      <div className="mt-1 text-sm">
        {locked ? (
          <span className="text-muted">🔒 {t(locale, "locked")}</span>
        ) : (
          <span className="text-ink-2">
            <span className="text-muted">{MARKET_LABEL[tip.market]}:</span> {selectionLabel(tip.market, tip.selection, tip.home, tip.away)}
          </span>
        )}
      </div>
      <div className="mt-2 text-xs text-muted">
        {pick(locale, tip.roomNameEn, tip.roomNameAm)} · {t(locale, "published")} {fmtDate(tip.publishedAt, locale, true)}
      </div>
    </Link>
  );
}

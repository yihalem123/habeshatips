import Link from "next/link";
import { IconLock } from "@/components/icons";
import { Chip, ResultChip, RoomMark } from "@/components/ui";
import { fmtKickoff, fmtOdds, fmtProfitU, fmtTime, MARKET_LABEL, selectionLabel } from "@/lib/format";
import { pick, t, type Locale } from "@/lib/i18n";
import type { TipView } from "@/lib/queries";

function resultLabels(locale: Locale) {
  return { win: t(locale, "win"), loss: t(locale, "loss"), void: t(locale, "void"), pending: t(locale, "pending") };
}

/** Pick card (dashboard, landing, room page). Locked variant hides the pick. */
export function PickCard({ tip, locale, locked, showRoom = true }: { tip: TipView; locale: Locale; locked: boolean; showRoom?: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3 text-[12px] text-muted">
        <span className="flex items-center gap-2">
          {showRoom && <RoomMark slug={tip.roomSlug} size={20} />}
          <span className="font-semibold text-ink-2">{showRoom ? pick(locale, tip.roomNameEn, tip.roomNameAm) : tip.leagueName}</span>
          {showRoom && <span>· {tip.leagueName}</span>}
        </span>
        <span className="num">{fmtKickoff(tip.kickoffAt, locale)}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="truncate text-[17px] font-extrabold">
          {tip.home} <span className="font-semibold text-muted">v</span> {tip.away}
        </div>
        <div className="num shrink-0 rounded-md bg-surface-3 px-2 py-1 text-[13px] font-bold">@ {locked ? "•.••" : fmtOdds(tip.odds)}</div>
      </div>
      {locked ? (
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-dashed border-white/10 px-3 py-2 text-[12.5px] text-muted">
          <IconLock size={14} /> {t(locale, "unlockNote")}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-[10px] border border-green/30 bg-green/[0.06] px-3 py-2">
          <span className="text-[13px] font-bold text-green">{selectionLabel(tip.market, tip.selection, tip.home, tip.away)}</span>
          {tip.confidence && <span className="num text-[11px] text-muted">conf {tip.confidence}/5</span>}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-muted">
        <span>
          {MARKET_LABEL[tip.market]} · {t(locale, "published")} {fmtTime(tip.publishedAt)} EAT
        </span>
        <Link href={`/tips/${tip.id}`} className="font-bold text-ink-2 hover:text-ink">
          {locked ? t(locale, "open") : t(locale, "readAnalysis")}
        </Link>
      </div>
    </div>
  );
}

/** Compact settled row for result lists. */
export function ResultRow({ tip, locale, showRoom = false }: { tip: TipView; locale: Locale; showRoom?: boolean }) {
  const score = tip.homeGoals !== null && tip.awayGoals !== null ? `${tip.homeGoals}–${tip.awayGoals}` : "—";
  const tone = tip.profit === null ? "text-muted" : tip.profit >= 0 ? "text-green" : "text-red";
  return (
    <Link href={`/tips/${tip.id}`} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-white/[0.03]">
      {showRoom ? <RoomMark slug={tip.roomSlug} size={22} /> : <span className="num text-[11px] text-muted">{fmtKickoff(tip.kickoffAt, locale).replace(" EAT", "")}</span>}
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-bold">
          {tip.home} <span className="font-medium text-muted">v</span> {tip.away}
        </span>
        <span className="block text-[11.5px] text-muted">{selectionLabel(tip.market, tip.selection, tip.home, tip.away)}{tip.isBacktest ? ` · ${t(locale, "period_backtest")}` : ""}</span>
      </span>
      <span className="num text-[12px] text-ink-2">
        {score} <span className="text-muted">@</span> {fmtOdds(tip.odds)}
      </span>
      <ResultChip result={tip.result} labels={resultLabels(locale)} />
      <span className={`num w-14 text-right text-[12px] font-bold ${tone}`}>{fmtProfitU(tip.profit)}</span>
    </Link>
  );
}

export function TipResultChip({ result, locale }: { result: string; locale: Locale }) {
  return <ResultChip result={result} labels={resultLabels(locale)} />;
}

export { Chip };

import Link from "next/link";
import { Sparkline } from "@/components/sparkline";
import { RoomMark } from "@/components/ui";
import { fmtPct, fmtRate, fmtUnits } from "@/lib/format";
import { pick, t, type Locale } from "@/lib/i18n";
import type { LeaderboardRow, Period } from "@/lib/queries";
import { roomMarkets } from "@/lib/rooms-meta";

export function LeaderboardTable({ rows, equity, locale, period, compact = false }: { rows: LeaderboardRow[]; equity?: Map<string, number[]>; locale: Locale; period: Period; compact?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="eyebrow border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left font-bold">{t(locale, "rank")}</th>
            <th className="px-2 py-3 text-left font-bold">{t(locale, "room")}</th>
            <th className="px-2 py-3 text-right font-bold">{t(locale, "tips")}</th>
            <th className="px-2 py-3 text-right font-bold">{t(locale, "winRate")}</th>
            {!compact && <th className="hidden px-2 py-3 text-center font-bold md:table-cell">{t(locale, "equity")}</th>}
            {!compact && <th className="hidden px-2 py-3 text-right font-bold sm:table-cell">{t(locale, "profit")}</th>}
            <th className="px-4 py-3 text-right font-bold">{t(locale, "roi")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const has = r.stats.tips > 0;
            const tone = !has ? "text-muted" : r.stats.roi > 0 ? "text-green" : r.stats.roi < 0 ? "text-red" : "text-ink";
            return (
              <tr key={r.room.id} className="border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.02]">
                <td className="num px-4 py-3 text-muted">{String(r.rank).padStart(2, "0")}</td>
                <td className="px-2 py-3">
                  <Link href={`/rooms/${r.room.slug}`} className="flex items-center gap-3">
                    <RoomMark slug={r.room.slug} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-ink">{pick(locale, r.room.nameEn, r.room.nameAm)}</span>
                      <span className="block text-[12px] text-muted">{roomMarkets(r.room.strategyConfig)} · {t(locale, "aiStrategy")}</span>
                    </span>
                  </Link>
                </td>
                <td className="num px-2 py-3 text-right text-ink-2">{has ? r.stats.tips : "—"}</td>
                <td className="num px-2 py-3 text-right text-ink-2">{has ? fmtRate(r.stats.winRate) : "—"}</td>
                {!compact && (
                  <td className="hidden px-2 py-3 text-center md:table-cell">
                    <Sparkline points={equity?.get(r.room.id) ?? []} />
                  </td>
                )}
                {!compact && <td className={`num hidden px-2 py-3 text-right sm:table-cell ${tone}`}>{has ? fmtUnits(r.stats.profit) : "—"}</td>}
                <td className={`num px-4 py-3 text-right font-bold ${tone}`}>{has ? fmtPct(r.stats.roi) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-white/[0.06] px-4 py-2.5 text-[12px] text-muted">{period === "backtest" || compact ? t(locale, "backtestNote") : t(locale, "everyRow")}</div>
    </div>
  );
}

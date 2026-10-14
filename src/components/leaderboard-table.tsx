import Link from "next/link";
import { fmtPct, fmtRate, fmtUnits } from "@/lib/format";
import { pick, t, type Locale } from "@/lib/i18n";
import type { LeaderboardRow, Period } from "@/lib/queries";
import { Pill } from "./stat";

export function LeaderboardTable({ rows, locale, period, compact = false }: { rows: LeaderboardRow[]; locale: Locale; period: Period; compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-bg-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          <tr>
            <th className="px-4 py-3 text-left font-medium">#</th>
            <th className="px-2 py-3 text-left font-medium">{t(locale, "rooms")}</th>
            <th className="num px-2 py-3 text-right font-medium">{t(locale, "tips")}</th>
            <th className="num px-2 py-3 text-right font-medium">{t(locale, "winRate")}</th>
            {!compact && <th className="num px-2 py-3 text-right font-medium">{t(locale, "profit")}</th>}
            <th className="num px-4 py-3 text-right font-medium">{t(locale, "roi")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const roi = r.stats.roi;
            const tone = r.stats.tips === 0 ? "text-muted" : roi > 0 ? "text-up" : roi < 0 ? "text-down" : "text-ink";
            return (
              <tr key={r.room.id} className="border-t border-line transition-colors hover:bg-surface-2">
                <td className="num px-4 py-3 text-muted">{String(r.rank).padStart(2, "0")}</td>
                <td className="px-2 py-3">
                  <Link href={`/rooms/${r.room.slug}`} className="font-medium hover:underline">
                    {pick(locale, r.room.nameEn, r.room.nameAm)}
                  </Link>
                  {!compact && (
                    <span className="ml-2 hidden sm:inline-block">
                      <Pill>{t(locale, "aiLabel")}</Pill>
                    </span>
                  )}
                </td>
                <td className="num px-2 py-3 text-right text-ink-2">{r.stats.tips}</td>
                <td className="num px-2 py-3 text-right text-ink-2">{r.stats.tips ? fmtRate(r.stats.winRate) : "—"}</td>
                {!compact && <td className={`num px-2 py-3 text-right ${tone}`}>{r.stats.tips ? fmtUnits(r.stats.profit) : "—"}</td>}
                <td className={`num px-4 py-3 text-right font-medium ${tone}`}>{r.stats.tips ? fmtPct(roi) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-line bg-bg-2 px-4 py-2 text-xs text-muted">
        {period === "backtest" ? t(locale, "backtestNote") : t(locale, "liveStartsNote")}
      </div>
    </div>
  );
}

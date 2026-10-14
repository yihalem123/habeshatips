import { LeaderboardTable } from "@/components/leaderboard-table";
import { PillTabs, StatCard } from "@/components/ui";
import { fmtDate, fmtPct, fmtTime } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { getLeaderboard, getLeaderboardSummary, getRooms, PERIODS, type Period } from "@/lib/queries";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  const period = (PERIODS.includes(sp.period as Period) ? sp.period : "all") as Period;
  let [rows, summary] = await Promise.all([getLeaderboard(period), getLeaderboardSummary(period)]);
  const rooms = await getRooms();
  // Until the live record exists, live periods fall back to the labelled backtest.
  const fellBack = period !== "backtest" && rows.every((r) => r.stats.tips === 0);
  if (fellBack) [rows, summary] = await Promise.all([getLeaderboard("backtest"), getLeaderboardSummary("backtest")]);
  const equity = new Map(rooms.map((r) => [r.room.id, r.equity]));
  const best = summary.best;
  return (
    <div className="mx-auto max-w-[1240px] px-0 md:px-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{t(locale, "leaderboard")}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {t(locale, "roiFormula")} {fellBack ? t(locale, "backtestShown") : ""}
          </p>
        </div>
        <PillTabs items={PERIODS.map((p) => ({ href: `/leaderboard?period=${p}`, label: t(locale, `period_${p}`), active: p === period }))} />
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={t(locale, "settledTips")} value={summary.settledTips.toLocaleString()} big />
        <StatCard label={t(locale, "bestRoom")} value={best ? fmtPct(best.roi) : "—"} sub={best ? `${pick(locale, best.room.nameEn, best.room.nameAm)} · ${best.tips} ${t(locale, "tips").toLowerCase()}` : undefined} tone={best && best.roi >= 0 ? "green" : "red"} big />
        <StatCard label={t(locale, "lastSettled")} value={summary.lastSettledAt ? fmtDate(summary.lastSettledAt, locale) : "—"} sub={summary.lastSettledAt ? `${fmtTime(summary.lastSettledAt)} EAT` : undefined} big />
      </div>
      <LeaderboardTable rows={rows} equity={equity} locale={locale} period={fellBack ? "backtest" : period} />
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

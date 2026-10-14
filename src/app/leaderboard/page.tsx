import { LeaderboardTable } from "@/components/leaderboard-table";
import { PeriodTabs } from "@/components/period-tabs";
import { getLocale, t } from "@/lib/i18n";
import { getLeaderboard, PERIODS, type Period } from "@/lib/queries";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const locale = await getLocale();
  const sp = await searchParams;
  const period = (PERIODS.includes(sp.period as Period) ? sp.period : "all") as Period;
  const rows = await getLeaderboard(period);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t(locale, "leaderboard")}</h1>
          <p className="mt-1 text-sm text-muted">ROI = profit ÷ tips at flat 1-unit stakes, settled at published odds.</p>
        </div>
        <PeriodTabs current={period} locale={locale} basePath="/leaderboard" />
      </div>
      <LeaderboardTable rows={rows} locale={locale} period={period} />
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

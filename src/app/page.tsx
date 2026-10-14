import Link from "next/link";
import { redirect } from "next/navigation";
import { IconBrain, IconData, IconHash, IconLayers, IconLock, IconShield } from "@/components/icons";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { RoomCard } from "@/components/room-card";
import { Button, Chip, Eyebrow, PillTabs, SectionTitle } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { getLocale, t } from "@/lib/i18n";
import { getLeaderboard, getRooms, getTodayPublicPicks, PERIODS, type Period } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";

export const metadata = { title: "HabeshaTips" };

export default async function Home({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  if (await getSessionUserId()) redirect("/dashboard");
  const locale = await getLocale();
  const sp = await searchParams;
  const period = (PERIODS.includes(sp.period as Period) && sp.period !== "backtest" ? sp.period : "all") as Period;
  const [live, backtest, rooms, picks] = await Promise.all([getLeaderboard(period), getLeaderboard("backtest"), getRooms(), getTodayPublicPicks()]);
  const hasLive = live.some((r) => r.stats.tips > 0);
  const board = hasLive ? live : backtest;
  const equity = new Map(rooms.map((r) => [r.room.id, r.equity]));
  const settled = board.reduce((s, r) => s + r.stats.tips, 0);
  const minPrice = Math.min(...rooms.map((r) => r.room.priceEtb).filter((p) => p > 0), 199);

  const steps = [
    { icon: <IconData />, title: "Data", body: "Fixtures, results, standings and bookmaker odds for the big five leagues and the Champions League, pulled every morning from several sources." },
    { icon: <IconBrain />, title: "Model + analysis", body: "A goal model refitted daily is blended with the market, then Claude writes the reasoning in English and Amharic." },
    { icon: <IconLayers />, title: "Rooms", body: "Six fixed rule sets read the same analysis. Each has a probability floor, an odds range and a daily cap. Silence is a valid output." },
    { icon: <IconHash />, title: "Hashed before kickoff", body: "Every pick is written with its odds, a UTC timestamp and a SHA-256 hash. Nothing is backfilled." },
    { icon: <IconShield />, title: "Settled in public", body: "Results are settled at the published odds with flat one-unit stakes. The leaderboard is arithmetic over that record." },
  ];

  return (
    <div>
      <section className="mx-auto max-w-[1240px] px-5 pb-10 pt-14 md:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rise">
            <Chip tone="green">{t(locale, "heroPill")}</Chip>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.02] tracking-tight md:text-[60px]">
              {t(locale, "tagline1")}
              <br />
              <span className="text-green">{t(locale, "tagline2")}</span>
            </h1>
            <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-ink-2 md:text-[17px]">{t(locale, "heroSub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/login?next=/dashboard" size="lg">{t(locale, "seePicks")}</Button>
              <Button href="/how-it-works" variant="outline" size="lg">{t(locale, "howItWorks")}</Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-10">
              <div>
                <dd className="num text-[28px] font-bold">{settled.toLocaleString()}</dd>
                <dt className="text-[12px] font-medium text-muted">{t(locale, "tipsSettled")}</dt>
              </div>
              <div>
                <dd className="num text-[28px] font-bold">{rooms.length}</dd>
                <dt className="text-[12px] font-medium text-muted">{t(locale, "strategyRooms")}</dt>
              </div>
              <div>
                <dd className="num text-[28px] font-bold">06:00</dd>
                <dt className="text-[12px] font-medium text-muted">{t(locale, "publishedDaily")}</dt>
              </div>
            </dl>
          </div>

          <div className="card rise p-5 lg:mt-6">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-extrabold">
                {t(locale, "todaysPicks")} <span className="num ml-1 text-[12px] font-medium text-muted">{new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", weekday: "short", day: "numeric", month: "short" }).format(new Date())}</span>
              </div>
              {picks.publishedAt && <span className="num text-[11px] text-muted">{t(locale, "published")} {fmtTime(picks.publishedAt)}</span>}
            </div>
            {picks.first ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-extrabold">
                      {picks.first.home} <span className="text-muted">v</span> {picks.first.away}
                    </div>
                    <div className="text-[11.5px] text-muted">{picks.first.leagueName} · {fmtTime(picks.first.kickoffAt)} EAT</div>
                  </div>
                  <span className="num flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[12px] font-bold text-ink">
                    <IconLock size={12} /> @ •.••
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12.5px]">
                  <span className="text-muted">{t(locale, "morePicks", { n: Math.max(0, picks.count - 1) })}</span>
                  <Link href="/rooms" className="font-bold text-green hover:underline">{t(locale, "unlockFrom", { price: minPrice })}</Link>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl bg-surface-3 px-4 py-5 text-[13px] text-muted">{t(locale, "noPicksYet")}</div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-10">
        <SectionTitle
          title={t(locale, "liveLeaderboard")}
          sub={`${t(locale, "roiFormula")} ${hasLive ? "" : t(locale, "backtestShown")}`}
          action={<PillTabs items={[{ href: "/?period=all", label: t(locale, "period_all"), active: period === "all" }, { href: "/?period=30d", label: t(locale, "period_30d"), active: period === "30d" }, { href: "/?period=7d", label: t(locale, "period_7d"), active: period === "7d" }]} />}
        />
        <LeaderboardTable rows={board} equity={equity} locale={locale} period={hasLive ? period : "backtest"} />
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-10" id="rooms">
        <SectionTitle title={t(locale, "sixRooms")} sub={t(locale, "sixRoomsSub")} action={<Link href="/rooms" className="text-[13px] font-bold text-ink-2 hover:text-ink">{t(locale, "allRooms")} →</Link>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <RoomCard key={r.room.id} room={r.room} live={r.live} backtest={r.backtest} locale={locale} variant="landing" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-10">
        <Eyebrow className="mb-4">{t(locale, "howItWorks")}</Eyebrow>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => (
            <div key={s.title} className="card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-surface-3 text-green">{s.icon}</span>
              <h3 className="mt-4 text-[15px] font-extrabold">{s.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

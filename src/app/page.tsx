import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { RoomCard } from "@/components/room-card";
import { TipCard } from "@/components/tip-card";
import { getLocale, t } from "@/lib/i18n";
import { activeRoomIds, canViewTip, getLatestPublicTips, getLeaderboard, getRooms } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";

export default async function Home() {
  const locale = await getLocale();
  const uid = await getSessionUserId();
  const [live, backtest, rooms, latest, subscribed] = await Promise.all([getLeaderboard("all"), getLeaderboard("backtest"), getRooms(), getLatestPublicTips(6), activeRoomIds(uid)]);
  const hasLive = live.some((r) => r.stats.tips > 0);
  const board = hasLive ? live : backtest;
  const settledTotal = board.reduce((s, r) => s + r.stats.tips, 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-lines absolute inset-0 -z-10 opacity-60" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div className="rise">
            <div className="mb-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Big five leagues + Champions League
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] md:text-6xl">{t(locale, "tagline")}</h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2 md:text-lg">{t(locale, "heroSub")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/rooms" className="rounded bg-gold px-5 py-2.5 font-medium text-black hover:bg-gold-2">
                {t(locale, "rooms")} →
              </Link>
              <Link href="/how-it-works" className="rounded border border-line-2 px-5 py-2.5 text-ink-2 hover:border-ink-2 hover:text-ink">
                {t(locale, "howItWorks")}
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{t(locale, "rooms")}</dt>
                <dd className="num mt-1 text-2xl">{rooms.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{t(locale, "settledPublicly")}</dt>
                <dd className="num mt-1 text-2xl">{settledTotal.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">Leagues</dt>
                <dd className="num mt-1 text-2xl">6</dd>
              </div>
            </dl>
          </div>
          <div className="rise rise-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{t(locale, "leaderboard")}</h2>
              <Link href="/leaderboard" className="text-sm text-gold hover:underline">{t(locale, "seeAll")} →</Link>
            </div>
            <LeaderboardTable rows={board} locale={locale} period={hasLive ? "all" : "backtest"} compact />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">{t(locale, "rooms")}</h2>
          <span className="text-sm text-muted">{t(locale, "aiLabel")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <RoomCard key={r.room.id} {...r} locale={locale} />
          ))}
        </div>
      </section>

      {latest.length > 0 && (
        <section className="border-t border-line bg-bg-2">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display mb-6 text-2xl font-semibold">{t(locale, "recentTips")}</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {latest.map((tip) => (
                <TipCard key={tip.id} tip={tip} locale={locale} locked={!canViewTip(tip, subscribed)} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
          {[
            ["01", "Published before kickoff", "Each pick is written to the record with a UTC timestamp and the odds at that moment. Nothing is backfilled."],
            ["02", "Hashed and public", "Every tip carries a SHA-256 hash over room, match, market, pick, odds and time. Anyone can open the tip page and check it."],
            ["03", "Settled in the open", "Results are settled at the published odds with flat one-unit stakes. ROI on the leaderboard is just arithmetic over that record."],
          ].map(([n, h, p]) => (
            <div key={n} className="rise rise-3">
              <div className="num text-sm text-gold">{n}</div>
              <h3 className="font-display mt-2 text-lg font-semibold">{h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{p}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

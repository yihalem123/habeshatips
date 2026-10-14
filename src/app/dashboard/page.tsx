import Link from "next/link";
import { redirect } from "next/navigation";
import { IconTelegram } from "@/components/icons";
import { PickCard, ResultRow } from "@/components/tip-views";
import { Button, Chip, Eyebrow, RoomMark, SectionTitle } from "@/components/ui";
import { addisHour, daysUntil, fmtDate, fmtDateLong, fmtProfitU } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { activeRoomIds, getExpiringSubscription, getRecentResults, getTodayTips, getUserSubscriptions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { smsConfigured } from "@/lib/sms";
import { linkUrl, telegramConfigured } from "@/lib/telegram";
import { ensureInviteLinks } from "@/lib/telegram-subscriptions";

export const metadata = { title: "Dashboard" };

/** Request-time clock (the page is dynamic; keeps the impure call out of the render body). */
async function currentTime() {
  return new Date();
}

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const locale = await getLocale();
  const [subs, roomIds] = await Promise.all([getUserSubscriptions(user.id), activeRoomIds(user.id)]);
  const [today, results, expiring] = await Promise.all([getTodayTips(roomIds), getRecentResults(roomIds), getExpiringSubscription(user.id)]);
  const tgOn = telegramConfigured();
  const [invites, connectUrl] = tgOn ? await Promise.all([ensureInviteLinks(user.id), linkUrl(user.id)]) : [[], null];
  const inviteBySlug = new Map(invites.map((i) => [i.roomSlug, i.link]));
  const now = await currentTime();
  const hour = addisHour(now);
  const greeting = hour < 12 ? t(locale, "goodMorning") : hour < 18 ? t(locale, "goodAfternoon") : t(locale, "goodEvening");
  const daysLeft = expiring ? daysUntil(expiring.sub.endsAt, now) : 0;

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>{fmtDateLong(now, locale)} · Addis Ababa</Eyebrow>
          <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight md:text-[30px]">
            {greeting} {today.length > 0 ? t(locale, "picksForYou", { n: today.length }) : t(locale, "noPicksForYou")}
          </h1>
        </div>
        <div className="flex gap-2">
          <Chip tone={user.telegramId ? "green" : "outline"}>{user.telegramId ? t(locale, "telegramLinked") : t(locale, "telegram")}</Chip>
          <Chip tone={user.smsOptIn ? "green" : "outline"}>{user.smsOptIn ? t(locale, "smsOn") : t(locale, "smsOff")}</Chip>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8 overflow-hidden">
          {today.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {today.map((tip) => (
                <PickCard key={tip.id} tip={tip} locale={locale} locked={false} />
              ))}
            </div>
          )}

          <section>
            <SectionTitle title={t(locale, "yourRooms")} action={<Link href="/rooms" className="text-[12.5px] font-bold text-muted hover:text-ink">{t(locale, "browseAll")}</Link>} />
            {subs.length === 0 ? (
              <div className="card flex items-center justify-between gap-3 p-5">
                <span className="text-[13.5px] text-ink-2">{t(locale, "noSubs")}</span>
                <Button href="/rooms">{t(locale, "rooms")} →</Button>
              </div>
            ) : (
              <div className="card divide-y divide-white/[0.06]">
                {subs.map(({ sub, room, active }) => {
                  const invite = active ? inviteBySlug.get(room.slug) : null;
                  return (
                    <div key={sub.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <RoomMark slug={room.slug} size={30} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/rooms/${room.slug}`} className="block truncate text-[14px] font-extrabold hover:underline">{pick(locale, room.nameEn, room.nameAm)}</Link>
                        <div className="num text-[11.5px] text-muted">
                          {t(locale, "ends")} {fmtDate(sub.endsAt, locale)}
                        </div>
                      </div>
                      <Chip tone={active ? "green" : "muted"}>{active ? t(locale, "active") : t(locale, "expired")}</Chip>
                      {active ? (
                        invite ? (
                          <Button href={invite} external variant="outline" size="sm">
                            <IconTelegram size={13} /> {t(locale, "joinChannel")}
                          </Button>
                        ) : null
                      ) : (
                        <Button href={`/checkout/${room.slug}`} size="sm">{t(locale, "renew")}</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              title={t(locale, "yourResults")}
              action={
                results.tips.length > 0 ? (
                  <span className={`num text-[12.5px] font-bold ${results.profit >= 0 ? "text-green" : "text-red"}`}>
                    {fmtProfitU(results.profit)} · {results.wins}W {results.losses}L
                  </span>
                ) : undefined
              }
            />
            <div className="card p-1.5">
              {results.tips.length === 0 ? <div className="px-4 py-5 text-[13px] text-muted">—</div> : results.tips.slice(0, 10).map((tip) => <ResultRow key={tip.id} tip={tip} locale={locale} showRoom />)}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          {expiring && (
            <div className="card border-amber/30 p-5">
              <div className="flex items-start gap-3">
                <RoomMark slug={expiring.room.slug} size={34} />
                <div>
                  <div className="text-[14px] font-extrabold">{daysLeft <= 0 ? t(locale, "expiresToday", { room: expiring.room.nameEn }) : t(locale, "expiresIn", { room: expiring.room.nameEn, n: daysLeft })}</div>
                  <p className="mt-1 text-[12.5px] text-muted">{t(locale, "renewNudge")}</p>
                  <Button href={`/checkout/${expiring.room.slug}`} size="sm" className="mt-3">
                    {t(locale, "renew")} · {expiring.room.priceEtb} ETB
                  </Button>
                </div>
              </div>
            </div>
          )}
          <form method="post" action="/api/settings" className="card overflow-hidden p-5">
            <div className="text-[14px] font-extrabold">{t(locale, "delivery")}</div>
            <div className="mt-3 divide-y divide-white/[0.06]">
              <div className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-3 text-telegram"><IconTelegram size={16} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{t(locale, "telegram")}</div>
                  <div className="truncate text-[11.5px] text-muted">{user.telegramId ? `${user.telegramUsername ? `@${user.telegramUsername} · ` : ""}${invites.filter((i) => i.link).length} channels` : tgOn ? t(locale, "telegramNotLinked") : "—"}</div>
                </div>
                {user.telegramId ? <span className="text-[12px] font-bold text-green">On</span> : tgOn && connectUrl ? <Button href={connectUrl} external size="sm">{t(locale, "connectTelegram")}</Button> : null}
              </div>
              <label className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-3 text-ink-2 text-[11px] font-extrabold">SMS</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{t(locale, "sms")}</span>
                  <span className="block text-[11.5px] text-muted">{t(locale, "smsSub")}{!smsConfigured() ? " · mock" : ""}</span>
                </span>
                <input type="checkbox" name="sms_opt_in" defaultChecked={user.smsOptIn} className="h-5 w-9 accent-green" />
              </label>
              <div className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-surface-3 text-ink-2 text-[11px] font-extrabold">EN</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold">{t(locale, "language")}</span>
                  <span className="block text-[11.5px] text-muted">{t(locale, "languageSub")}</span>
                </span>
                <select name="locale" defaultValue={user.locale} className="rounded-md border border-white/10 bg-bg-2 px-2 py-1 text-[12px] font-bold">
                  <option value="en">EN</option>
                  <option value="am">አማ</option>
                </select>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full">{t(locale, "save")}</Button>
          </form>
          <p className="px-1 text-[11.5px] leading-relaxed text-muted">{t(locale, "responsible")}</p>
        </aside>
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { TipCard } from "@/components/tip-card";
import { fmtDate } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { activeRoomIds, getTodayTips, getUserSubscriptions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { smsConfigured } from "@/lib/sms";
import { linkUrl, telegramConfigured } from "@/lib/telegram";
import { ensureInviteLinks } from "@/lib/telegram-subscriptions";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const locale = await getLocale();
  const [subs, roomIds] = await Promise.all([getUserSubscriptions(user.id), activeRoomIds(user.id)]);
  const today = await getTodayTips(roomIds);
  const tgOn = telegramConfigured();
  const [invites, connectUrl] = tgOn ? await Promise.all([ensureInviteLinks(user.id), linkUrl(user.id)]) : [[], null];
  const inviteBySlug = new Map(invites.map((i) => [i.roomSlug, i.link]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t(locale, "dashboard")}</h1>
          <p className="num mt-1 text-sm text-muted">{user.phone}</p>
        </div>
        <form method="post" action="/api/auth/logout">
          <button className="rounded border border-line px-3 py-1.5 text-sm text-ink-2 hover:text-ink">{t(locale, "logout")}</button>
        </form>
      </div>

      <section className="mt-10">
        <h2 className="font-display mb-3 text-xl font-semibold">{t(locale, "todayTips")}</h2>
        {today.length === 0 ? (
          <p className="text-sm text-muted">{roomIds.size === 0 ? t(locale, "noSubs") : "No picks published for your rooms yet today."}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {today.map((tip) => (
              <TipCard key={tip.id} tip={tip} locale={locale} locked={false} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display mb-3 text-xl font-semibold">{t(locale, "yourRooms")}</h2>
        {subs.length === 0 ? (
          <Link href="/rooms" className="text-gold hover:underline">{t(locale, "rooms")} →</Link>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-sm">
              <tbody>
                {subs.map(({ sub, room, active }) => {
                  const invite = active ? inviteBySlug.get(room.slug) : null;
                  return (
                    <tr key={sub.id} className="border-t border-line first:border-t-0">
                      <td className="px-4 py-3">
                        <Link href={`/rooms/${room.slug}`} className="font-medium hover:underline">{pick(locale, room.nameEn, room.nameAm)}</Link>
                      </td>
                      <td className="num px-4 py-3 text-ink-2">{t(locale, "expires")} {fmtDate(sub.endsAt, locale)}</td>
                      <td className="px-4 py-3 text-right">
                        {active ? (
                          invite ? (
                            <a href={invite} className="text-gold hover:underline" target="_blank" rel="noreferrer">Join Telegram channel →</a>
                          ) : (
                            <span className="text-up">active</span>
                          )
                        ) : (
                          <Link href={`/checkout/${room.slug}`} className="text-gold hover:underline">{t(locale, "renew")} →</Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">Telegram</h2>
          {!tgOn ? (
            <p className="mt-2 text-sm text-muted">Telegram delivery is not configured yet.</p>
          ) : user.telegramId ? (
            <p className="mt-2 text-sm text-ink-2">
              Linked{user.telegramUsername ? ` as @${user.telegramUsername}` : ""}. Renewal reminders arrive as a direct message; room channels are listed above.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-2">Link your Telegram to get reminders by DM and join your room channels with one tap.</p>
              <a href={connectUrl!} className="mt-4 inline-block rounded bg-gold px-4 py-2 font-medium text-black hover:bg-gold-2" target="_blank" rel="noreferrer">
                Connect Telegram →
              </a>
            </>
          )}
        </div>
        <form method="post" action="/api/settings" className="rounded-lg border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">SMS</h2>
          <label className="mt-3 flex items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" name="sms_opt_in" defaultChecked={user.smsOptIn} className="mt-1 accent-gold" />
            <span>
              One text per room per matchday with the picks, plus renewal reminders.
              {!smsConfigured() && <span className="block text-xs text-muted">SMS gateway not configured: messages are logged, not sent.</span>}
            </span>
          </label>
          <label className="mt-4 block text-sm text-ink-2">
            Language
            <select name="locale" defaultValue={user.locale} className="ml-2 rounded border border-line bg-bg-2 px-2 py-1 text-ink">
              <option value="en">English</option>
              <option value="am">አማርኛ</option>
            </select>
          </label>
          <button className="mt-4 rounded border border-line-2 px-4 py-2 text-sm text-ink hover:border-ink-2">Save</button>
        </form>
      </section>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

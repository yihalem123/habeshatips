import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevron, IconShare } from "@/components/icons";
import { TipResultChip } from "@/components/tip-views";
import { Button, Chip, Eyebrow, RoomMark } from "@/components/ui";
import { fmtDateTimeIso, fmtKickoff, fmtLead, fmtOdds, fmtPct, fmtProfitU, fmtRate, MARKET_LABEL, selectionLabel, shortTipId } from "@/lib/format";
import { getLocale, pick, t } from "@/lib/i18n";
import { activeRoomIds, canViewTip, getTip, getTipContext, roomStatsFromTips } from "@/lib/queries";
import { getSessionUserId } from "@/lib/session";

export default async function TipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [locale, tip, uid] = await Promise.all([getLocale(), getTip(id), getSessionUserId()]);
  if (!tip) notFound();
  const [subscribed, ctx, roomStats] = await Promise.all([activeRoomIds(uid), getTipContext(id), roomStatsFromTips(tip.roomId, tip.isBacktest)]);
  const visible = canViewTip(tip, subscribed);
  const score = tip.homeGoals !== null && tip.awayGoals !== null ? `${tip.homeGoals}–${tip.awayGoals}` : null;
  const [headEn, ...restEn] = tip.rationaleEn.split("\n\n");
  const [headAm, ...restAm] = tip.rationaleAm.split("\n\n");
  const body = locale === "am" ? restAm.join("\n\n") || headAm : restEn.join("\n\n") || headEn;
  const head = locale === "am" ? headAm : headEn;
  const status = tip.fixtureStatus === "finished" ? t(locale, "fullTime") : tip.fixtureStatus === "live" ? "Live" : "";

  return (
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
          <Link href={`/rooms/${tip.roomSlug}`} className="hover:text-ink">{pick(locale, tip.roomNameEn, tip.roomNameAm)}</Link>
          <IconChevron size={14} />
          <span>{tip.leagueName}</span>
          <IconChevron size={14} />
          <span className="num text-ink-2">{shortTipId(tip.id)}</span>
        </div>
        <Button href={`/tips/${tip.id}`} variant="outline" size="sm">
          <IconShare size={14} /> {t(locale, "shareLink")}
        </Button>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <TipResultChip result={tip.result} locale={locale} />
            {tip.isBacktest && <Chip tone="muted">{t(locale, "period_backtest")}</Chip>}
            <span>
              {tip.leagueName} · {t(locale, "kickoff")} {fmtKickoff(tip.kickoffAt, locale)}
              {status ? ` · ${status}` : ""}
            </span>
          </div>
          <h1 className="mt-3 text-[34px] font-extrabold leading-tight tracking-tight md:text-[40px]">
            {tip.home} <span className="font-semibold text-muted">v</span> {tip.away}
            {score && <span className="num ml-3 text-[26px] font-bold text-ink-2">{score}</span>}
          </h1>

          <div className="card mt-6 grid grid-cols-2 gap-5 p-5 md:grid-cols-4">
            <div>
              <Eyebrow>{t(locale, "market")}</Eyebrow>
              <div className="mt-1.5 text-[15px] font-extrabold">{MARKET_LABEL[tip.market]}</div>
            </div>
            <div>
              <Eyebrow>{t(locale, "pick")}</Eyebrow>
              <div className="mt-1.5 text-[15px] font-extrabold text-green">{visible ? selectionLabel(tip.market, tip.selection, tip.home, tip.away) : "••••"}</div>
            </div>
            <div>
              <Eyebrow>{t(locale, "oddsAtPublish")}</Eyebrow>
              <div className="num mt-1.5 text-[22px] font-bold leading-none">{visible ? fmtOdds(tip.odds) : "•.••"}</div>
            </div>
            <div>
              <Eyebrow>{t(locale, "profit1u")}</Eyebrow>
              <div className={`num mt-1.5 text-[22px] font-bold leading-none ${tip.profit === null ? "text-muted" : tip.profit >= 0 ? "text-green" : "text-red"}`}>{fmtProfitU(tip.profit)}</div>
            </div>
          </div>

          {visible ? (
            <div className="card mt-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-extrabold">{t(locale, "analysis")}</h2>
                <div className="pill-tabs inline-flex rounded-[10px] border border-white/10 bg-bg-2 p-[3px]">
                  <a href="/api/locale?set=en" data-active={locale === "en"}>English</a>
                  <a href="/api/locale?set=am" data-active={locale === "am"}>አማርኛ</a>
                </div>
              </div>
              {head && head !== body && <p className="mt-3 text-[15px] font-bold">{head}</p>}
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{body}</p>
              {ctx && !tip.isBacktest && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {ctx.modelProb !== null && (
                    <Chip tone="muted" className="normal-case tracking-normal">
                      {t(locale, "model")} {fmtRate(ctx.modelProb)}{ctx.marketProb !== null ? ` · ${t(locale, "marketShort")} ${fmtRate(ctx.marketProb)}` : ""}
                    </Chip>
                  )}
                  {ctx.homePpg !== null && <Chip tone="muted" className="normal-case tracking-normal">{t(locale, "homeForm")} {ctx.homePpg.toFixed(1)} {t(locale, "ppg")}</Chip>}
                  {ctx.awayPpg !== null && <Chip tone="muted" className="normal-case tracking-normal">{t(locale, "awayForm")} {ctx.awayPpg.toFixed(1)} {t(locale, "ppg")}</Chip>}
                  {!ctx.injuryFeedAvailable && <Chip tone="amber" className="normal-case tracking-normal">{t(locale, "teamNewsUnavailable")}</Chip>}
                </div>
              )}
            </div>
          ) : (
            <div className="card mt-4 flex flex-col items-start gap-3 p-5">
              <p className="text-[14px] text-ink-2">{t(locale, "unlockNote")}.</p>
              <Button href={`/checkout/${tip.roomSlug}`}>{t(locale, "subscribe")}</Button>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="card p-5">
            <div className="text-[14px] font-extrabold">{t(locale, "verifiedRecord")}</div>
            <dl className="num mt-4 space-y-3 text-[12.5px]">
              <div>
                <dt className="eyebrow">{t(locale, "published")}</dt>
                <dd className="mt-0.5 text-ink">{fmtDateTimeIso(tip.publishedAt)}</dd>
              </div>
              <div>
                <dt className="eyebrow">{t(locale, "kickoff")}</dt>
                <dd className="mt-0.5 text-ink">{fmtDateTimeIso(tip.kickoffAt)}</dd>
              </div>
              <div>
                <dt className="eyebrow">{t(locale, "leadTime")}</dt>
                <dd className="mt-0.5 text-green">{fmtLead(tip.publishedAt, tip.kickoffAt)} {t(locale, "beforeKickoff")}</dd>
              </div>
              <div>
                <dt className="eyebrow">SHA-256</dt>
                <dd className="mt-1 break-all rounded-lg bg-bg-2 px-3 py-2 text-[11px] leading-relaxed text-ink-2">{tip.hash}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">{t(locale, "hashNote")}</p>
          </div>
          <Link href={`/rooms/${tip.roomSlug}`} className="card flex items-center gap-3 p-4 hover:border-white/20">
            <RoomMark slug={tip.roomSlug} size={36} />
            <span>
              <span className="block text-[14px] font-extrabold">{pick(locale, tip.roomNameEn, tip.roomNameAm)}</span>
              <span className="num block text-[12px] text-muted">
                {roomStats.tips} {t(locale, "tips").toLowerCase()} · {fmtRate(roomStats.winRate)} {t(locale, "win").toLowerCase()} · {fmtPct(roomStats.roi)} {t(locale, "roi")}
              </span>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

// Personalised per request (locale cookie, session): allowed to block instead of prerendering.
export const instant = false;

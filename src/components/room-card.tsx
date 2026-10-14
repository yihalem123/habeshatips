import Link from "next/link";
import { Button, Chip, RoomMark } from "@/components/ui";
import { fmtPct, fmtRate } from "@/lib/format";
import { pick, t, type Locale } from "@/lib/i18n";
import type { RoomRow, Stats } from "@/lib/queries";
import { roomMarkets, roomMaxPerDay } from "@/lib/rooms-meta";

export function RoomCard({ room, live, backtest, locale, variant = "full" }: { room: RoomRow; live: Stats; backtest: Stats; locale: Locale; variant?: "full" | "landing" }) {
  const shown = live.tips > 0 ? live : backtest;
  const sub = live.tips > 0 ? t(locale, "period_all") : t(locale, "period_backtest");
  const tone = shown.tips === 0 ? "text-muted" : shown.roi > 0 ? "text-green" : shown.roi < 0 ? "text-red" : "text-ink";
  const cfg = room.strategyConfig as { tag?: string };
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/rooms/${room.slug}`} className="flex min-w-0 items-center gap-3">
          <RoomMark slug={room.slug} size={32} />
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-extrabold text-ink">{pick(locale, room.nameEn, room.nameAm)}</span>
            <span className="block text-[12px] text-muted">{roomMarkets(room.strategyConfig)} · {t(locale, "aiStrategy")}</span>
          </span>
        </Link>
        <Chip tone="outline">{t(locale, "maxPerDay", { n: roomMaxPerDay(room.strategyConfig) })}</Chip>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{cfg.tag ?? room.persona}</p>
      {variant === "landing" ? (
        <div className="mt-5 flex items-end justify-between border-t border-white/[0.06] pt-4">
          <div>
            <div className={`num text-[26px] font-bold leading-none ${tone}`}>{shown.tips ? fmtPct(shown.roi) : "—"}</div>
            <div className="mt-1 text-[11px] text-muted">
              {t(locale, "roi")} · {sub}
            </div>
          </div>
          <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[12px] font-bold text-ink">
            {room.priceEtb} ETB <span className="text-muted">{t(locale, "perMo")}</span>
          </span>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
            <div>
              <div className="eyebrow">{t(locale, "roi")}</div>
              <div className={`num mt-1 text-[22px] font-bold leading-none ${tone}`}>{shown.tips ? fmtPct(shown.roi) : "—"}</div>
            </div>
            <div>
              <div className="eyebrow">{t(locale, "win")}</div>
              <div className="num mt-1 text-[22px] font-bold leading-none text-ink">{shown.tips ? fmtRate(shown.winRate) : "—"}</div>
            </div>
            <div>
              <div className="eyebrow">{t(locale, "tips")}</div>
              <div className="num mt-1 text-[22px] font-bold leading-none text-ink">{shown.tips || "—"}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button href={`/checkout/${room.slug}`} className="flex-1">
              {t(locale, "subscribe")} · {room.priceEtb} ETB
            </Button>
            <Button href={`/rooms/${room.slug}`} variant="outline">{t(locale, "details")}</Button>
          </div>
        </>
      )}
    </div>
  );
}

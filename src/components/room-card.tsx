import Link from "next/link";
import { fmtPct, fmtRate } from "@/lib/format";
import { pick, t, type Locale } from "@/lib/i18n";
import type { RoomRow, Stats } from "@/lib/queries";
import { Sparkline } from "./sparkline";
import { Pill } from "./stat";

export function RoomCard({ room, live, backtest, equity, equityIsBacktest, locale }: { room: RoomRow; live: Stats; backtest: Stats; equity: number[]; equityIsBacktest: boolean; locale: Locale }) {
  const shown = live.tips > 0 ? live : backtest;
  const label = live.tips > 0 ? t(locale, "period_all") : t(locale, "period_backtest");
  const tone = shown.tips === 0 ? "text-muted" : shown.roi > 0 ? "text-up" : shown.roi < 0 ? "text-down" : "text-ink";
  return (
    <Link href={`/rooms/${room.slug}`} className="group flex flex-col justify-between rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-2 hover:bg-surface-2">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-xl font-semibold leading-tight">{pick(locale, room.nameEn, room.nameAm)}</div>
            <div className="mt-1 text-xs text-muted">{(room.strategyConfig as { markets?: string[] }).markets?.join(" · ")}</div>
          </div>
          <Pill tone="gold">{t(locale, "aiLabel")}</Pill>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-2">{room.persona}</p>
      </div>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted">{label} · {t(locale, "roi")}</div>
          <div className={`num text-2xl font-medium ${tone}`}>{shown.tips ? fmtPct(shown.roi) : "—"}</div>
          <div className="num text-xs text-muted">{shown.tips ? `${shown.tips} ${t(locale, "tips").toLowerCase()} · ${fmtRate(shown.winRate)}` : t(locale, "noLiveYet")}</div>
        </div>
        <div className="text-right">
          <Sparkline points={equity} width={140} height={40} />
          <div className="text-[10px] uppercase tracking-wider text-muted">{equityIsBacktest ? t(locale, "period_backtest") : "Live"}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="num text-ink-2">{room.priceEtb > 0 ? `${room.priceEtb} ETB ${t(locale, "perMonth")}` : "—"}</span>
        <span className="text-gold group-hover:underline">{t(locale, "subscribe")} →</span>
      </div>
    </Link>
  );
}

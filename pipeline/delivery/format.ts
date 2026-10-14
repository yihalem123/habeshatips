import type { TipView } from "../../src/lib/queries";
import { MARKET_LABEL, selectionLabel } from "../../src/lib/format";
import { escapeHtml } from "../../src/lib/telegram";

export function origin() {
  return (process.env.PUBLIC_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
}

const fmtKo = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);

/** Channel post for one tip: English pick line, Amharic headline, verification link. */
export function tipHtml(tip: TipView, roomName: string): string {
  const [headEn] = tip.rationaleEn.split("\n\n");
  const [headAm] = tip.rationaleAm.split("\n\n");
  return [
    `<b>${escapeHtml(roomName)}</b> · ${escapeHtml(tip.leagueName)}`,
    `<b>${escapeHtml(tip.home)} v ${escapeHtml(tip.away)}</b> — ${fmtKo(tip.kickoffAt)} EAT`,
    `${MARKET_LABEL[tip.market]}: <b>${escapeHtml(selectionLabel(tip.market, tip.selection, tip.home, tip.away))}</b> @ ${tip.odds.toFixed(2)}`,
    headEn ? escapeHtml(headEn) : "",
    headAm ? escapeHtml(headAm) : "",
    `Verify: ${origin()}/tips/${tip.id}`,
    `18+ · Bet responsibly.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** One SMS per room per day: short, ASCII-safe (GSM-7) so it stays one segment where possible. */
export function tipsSms(roomName: string, tips: TipView[]): string {
  const lines = tips.slice(0, 3).map((t) => `${t.home} v ${t.away}: ${selectionLabel(t.market, t.selection, t.home, t.away)} @${t.odds.toFixed(2)}`);
  const more = tips.length > 3 ? ` +${tips.length - 3} more` : "";
  return `HabeshaTips ${roomName}: ${lines.join("; ")}${more}. ${origin()}/dashboard 18+`;
}

export function reminderSms(roomName: string, days: number): string {
  return `HabeshaTips: your ${roomName} room ends in ${days} day${days === 1 ? "" : "s"}. Renew: ${origin()}/dashboard`;
}

export function reminderHtml(roomName: string, days: number): string {
  return `Your <b>${escapeHtml(roomName)}</b> room ends in ${days} day${days === 1 ? "" : "s"}. Renew at ${origin()}/dashboard to keep channel access.`;
}

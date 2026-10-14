import type { Locale } from "./i18n";

export const fmtOdds = (v: number | string) => Number(v).toFixed(2);
export const fmtPct = (v: number, digits = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;
export const fmtRate = (v: number) => `${(v * 100).toFixed(0)}%`;
export const fmtUnits = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;

export function fmtDate(d: Date, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
    timeZone: "Africa/Addis_Ababa",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function fmtDateTimeIso(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export const MARKET_LABEL: Record<string, string> = { "1X2": "Match result", OU25: "Over/Under 2.5", BTTS: "Both teams to score" };

export function selectionLabel(market: string, selection: string, home: string, away: string): string {
  if (market === "1X2") return selection === "H" ? `${home} to win` : selection === "A" ? `${away} to win` : "Draw";
  if (market === "OU25") return selection === "O" ? "Over 2.5 goals" : "Under 2.5 goals";
  return selection === "Y" ? "Both teams score: Yes" : "Both teams score: No";
}

export function fmtDateLong(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", { timeZone: "Africa/Addis_Ababa", weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function fmtKickoff(d: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", { timeZone: "Africa/Addis_Ababa", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d) + " EAT";
}

/** "15 h 40 m" between two instants. */
export function fmtLead(from: Date, to: Date) {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} m` : `${m} m`;
}

export function shortTipId(id: string) {
  return id.length > 14 ? `tip_${id.slice(0, 5)}…${id.slice(-3)}` : id;
}

export function selectionShort(market: string, selection: string, home: string, away: string): string {
  if (market === "1X2") return selection === "H" ? home : selection === "A" ? away : "Draw";
  if (market === "OU25") return selection === "O" ? "Over 2.5" : "Under 2.5";
  return selection === "Y" ? "BTTS Yes" : "BTTS No";
}

export function fmtProfitU(v: number | null) {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}u`;
}

/** Current hour and days-until helpers kept out of component render bodies. */
export function addisHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", hour: "numeric", hour12: false }).format(now));
}

export function daysUntil(d: Date, now = new Date()) {
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

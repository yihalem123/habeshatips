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

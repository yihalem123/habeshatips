/**
 * The Odds API v4. Free plan: 500 credits/month. A call costs markets × regions
 * (or markets × ceil(bookmakers/10)); h2h + totals for one league = 2 credits.
 * Six leagues once a day ≈ 360 credits/month. Key: THE_ODDS_API_KEY.
 */
import { fetchJson } from "./http";
import type { Provider, ProviderOdds } from "./types";
import type { CompetitionCode } from "../data/api-football";

const BASE = "https://api.the-odds-api.com/v4";
const SPORT_KEYS: Record<CompetitionCode, string> = {
  E0: "soccer_epl",
  SP1: "soccer_spain_la_liga",
  I1: "soccer_italy_serie_a",
  D1: "soccer_germany_bundesliga",
  F1: "soccer_france_ligue_one",
  UCL: "soccer_uefa_champs_league",
};
/** Preferred bookmakers in order; the first one quoting a market wins. ≤10 keeps the cost at 1× per market. */
const BOOKMAKERS = ["bet365", "pinnacle", "williamhill", "unibet_eu", "betfair_ex_eu", "onexbet", "betsson", "nordicbet"];

interface OddsEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: { key: string; title: string; markets: { key: string; outcomes: { name: string; price: number; point?: number }[] }[] }[];
}

export let lastQuota: { remaining: number | null; used: number | null } = { remaining: null, used: null };

export const theOddsApi: Provider = {
  name: "theOddsApi",
  competitions: ["E0", "SP1", "I1", "D1", "F1", "UCL"],
  budget: { perDay: null, perMinute: 30, creditsPerMonth: Number(process.env.THE_ODDS_API_MONTHLY_CREDITS ?? "500") },
  available: () => !!process.env.THE_ODDS_API_KEY || process.env.PROVIDER_MOCK === "1",

  async odds(competition) {
    const params = new URLSearchParams({
      apiKey: process.env.THE_ODDS_API_KEY ?? "",
      markets: "h2h,totals",
      oddsFormat: "decimal",
      bookmakers: BOOKMAKERS.join(","),
    });
    const events = await fetchJson<OddsEvent[]>({
      provider: "theOddsApi",
      url: `${BASE}/sports/${SPORT_KEYS[competition]}/odds?${params}`,
      minIntervalMs: 2_000,
      cache: false,
      credits: 2,
      mockKey: `odds_${SPORT_KEYS[competition]}.json`,
      onHeaders: (h) => {
        lastQuota = { remaining: Number(h.get("x-requests-remaining")), used: Number(h.get("x-requests-used")) };
      },
    });
    const out: ProviderOdds[] = [];
    for (const ev of events) {
      const ranked = [...ev.bookmakers].sort((x, y) => BOOKMAKERS.indexOf(x.key) - BOOKMAKERS.indexOf(y.key));
      const o: ProviderOdds = {
        provider: "theOddsApi",
        externalId: ev.id,
        competition,
        kickoffUtc: new Date(ev.commence_time),
        homeRaw: ev.home_team,
        awayRaw: ev.away_team,
        bookmaker: "",
        h: null, d: null, a: null, over25: null, under25: null, bttsYes: null, bttsNo: null,
      };
      for (const bm of ranked) {
        const h2h = bm.markets.find((m) => m.key === "h2h");
        if (h2h && o.h === null) {
          for (const x of h2h.outcomes) {
            if (x.name === ev.home_team) o.h = x.price;
            else if (x.name === ev.away_team) o.a = x.price;
            else if (x.name === "Draw") o.d = x.price;
          }
          o.bookmaker = o.bookmaker || bm.title;
        }
        const tot = bm.markets.find((m) => m.key === "totals");
        if (tot && o.over25 === null) {
          for (const x of tot.outcomes) {
            if (x.point !== 2.5) continue;
            if (x.name === "Over") o.over25 = x.price;
            else if (x.name === "Under") o.under25 = x.price;
          }
          o.bookmaker = o.bookmaker || bm.title;
        }
        if (o.h !== null && o.over25 !== null) break;
      }
      if (o.h !== null || o.over25 !== null) out.push(o);
    }
    return out;
  },
};

# Football data and odds providers — pricing snapshot (2026-10-12)

Prices read from each provider's own pricing page unless marked *reported*. Monthly, billed monthly.

## Stats + fixtures providers

| Provider | Free tier | Entry paid | Mid | Leagues | Odds | Injuries / lineups | Notes |
|---|---|---|---|---|---|---|---|
| **API-Football** (api-sports.io) *reported, site blocked* | 100 req/day, all endpoints, older seasons only | Pro ~$19 (7,500 req/day) | Ultra ~$29 (75k/day), Mega ~$39 (150k/day) | 1,100+ | Yes, many bookmakers | Yes / yes, plus predictions | Cheapest full feed; coverage uneven outside top leagues |
| **Sportmonks** | Limited free tier, no card | Starter €29, any 5 leagues, 2,000 req/entity/hour | Growth €99 (30 leagues), Pro €249 (120) | 2,300+ | Add-on €15/mo (odds + AI predictions, 50+ bookmakers) | Included | Historical older than 3 seasons is a one-time add-on from €29; xG add-on €24/mo; 14-day trial |
| **football-data.org** | 12 comps, 10 req/min, delayed scores | €12 live scores; €29 "Deep Data" (lineups, subs, cards) | Standard €49 (30 comps), Advanced €99 (50), Pro €199 (100) | up to 100 | Add-on €15/mo, 1X2 only, 40 comps | Lineups yes, injuries no | Simplest and most stable; no injuries anywhere |
| **TheStatsAPI** | 7-day trial only | Starter $50, 100k req/mo, 120 req/min | Growth $129 (500k), Scale $379 (5M) | 150 included, up to 1,196 on request | Included, pre-match + live | Lineups yes (all endpoints), injuries not stated | xG included; flat pricing, no add-ons |
| **FootyStats** | Premier League only, 180 req/hour | Hobby £29.99, 50 leagues, 1,800 req/hour | Serious £69.99 (150 leagues), Everything £389.99 (1,500+) | 1,500+ | Not stated | Not stated | Strong on form/trend stats (BTTS %, over %, xG averages); no odds feed |
| **Opta / Stats Perform** | No | Custom quote | — | All | Yes | Yes | Enterprise; third parties estimate £500–2,000+/mo, unverified |
| **Sportradar** | Trial via developer marketplace | Custom quote | — | All | Yes | Yes | Enterprise; estimates €1,300+/mo with annual minimums, unverified |

## Odds-only providers

| Provider | Free tier | Entry paid | Mid | Bookmakers | Historical odds | Notes |
|---|---|---|---|---|---|---|
| **The Odds API** | 500 credits/mo | $30 (20k credits) | $59 (100k), $119 (5M), $249 (15M) | Most major books | Yes (listed) | Simple, widely used; football across major leagues |
| **Odds-API.io** | Paused for new keys | Solo $65 (2 bookmakers, 5k req/hour) | Starter $129 (5 books), Growth $239 (10), Pro $299 (15) | up to 265 | Not stated | Pay per bookmaker count |
| **SportsGameOdds** | 2,500 objects/mo, 9 books, UCL + MLS only | Rookie $99 (100k objects, 77 books, PL + 10 leagues) | Pro $299 (unlimited, 82 books, 50 leagues, historical) | 82 | Pro and up | US-centric, soccer coverage grows with tier |
| **Betfair Exchange API** | Delayed key free (1–60 s delay) | Live key £299 one-off | — | Exchange only | No | Needs a verified, funded Betfair account; not available in several countries; exchange prices are the sharpest signal available |
| **football-data.co.uk** (CSV) | Free | — | — | ~10 books, open + closing | Yes, decades | What the backtest uses today; not an API, updated after matches |

## Recommendation for HabeshaTips

Budget target is under $100/month total.

- **Default: API-Football Pro (~$19) + football-data.co.uk (free).** One key covers fixtures, lineups, injuries, standings and odds for the six competitions. The free tier is enough to build against; upgrade when live. Risk: Cloudflare-fronted site and uneven data quality outside top leagues.
- **If you want a cleaner, better-supported feed: Sportmonks Starter (€29) + odds add-on (€15) ≈ €44.** Only 5 leagues on Starter, and we need 6 (Big 5 + UCL), so it is Growth at €99 or a 6th league add-on from €4.
- **If odds depth matters more than stats: The Odds API $30 alongside football-data.org Deep Data €29.** Clean, but no injuries.
- **Skip for now:** Opta, Sportradar (enterprise pricing), Odds-API.io (free keys paused, per-bookmaker pricing), Betfair (account and geography hurdles).

Verify API-Football's current prices on its site before paying; those figures could not be read directly today.

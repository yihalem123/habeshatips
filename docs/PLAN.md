# HabeshaTips — Product & Technical Plan

Status: living design document. Sections are appended as phases complete.

## 1. The product in one paragraph

HabeshaTips is a subscription site for soccer betting tips. The tips are produced by an AI
pipeline that pulls daily data on fixtures, team form, standings, injuries, lineups,
head-to-head and bookmaker odds, runs a statistical model, and then has Claude write a
reasoned pick with a rationale in English and Amharic. Tips are grouped into **tipping
rooms**. Each room follows a different strategy, so their results genuinely diverge. A public
**leaderboard** ranks rooms by return on investment (ROI) over verified, timestamped,
settled tips. Users subscribe per room, per month, and receive tips on the website, in a
private Telegram channel, and by SMS.

### Positioning decision (important)

Rooms are presented as **named AI strategies**, not as human tipsters. The leaderboard shows
only real settled results (plus clearly labeled backtests before launch). This is both the
legally safe choice and the stronger marketing claim: "every tip is timestamped before
kickoff and settled publicly; nobody can edit history." Users can verify any tip.

What we will NOT do: invent human seller personas, fabricate win records, or claim
guaranteed profit. Advertising rules in the UK (ASA/CAP) require substantiated track-record
claims; France treats "improves your odds" claims as misleading by nature. Ethiopia's rules
after the relaunch are unknown, so the conservative posture is the default.

## 2. Decisions captured so far

| Area | Decision |
|---|---|
| Audience | Ethiopia (user states betting is legal again; see §10 for verification note) |
| Languages | English + Amharic (bilingual toggle, AI writes rationale in both) |
| Leagues | Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League |
| Bet types | Match result (1X2), Over/Under 2.5 goals, Both Teams To Score (BTTS) |
| Rooms | 5+ strategy rooms with personas, labeled as AI strategies |
| Leaderboard | ROI on flat 1-unit stakes, win rate shown beside it |
| Pricing | Per room, monthly |
| Delivery | Website + Telegram channels + SMS |
| Payments | Chapa primary, SantimPay backup |
| Stack | Next.js + Postgres + Node (single TypeScript codebase) |
| Budget | Under $100/month pre-revenue |
| Launch leaderboard | Backtested history, clearly labeled; live record starts at zero |

## 3. Rooms (initial six)

Each room = a **filter over the same daily model output** + a **persona prompt** that shapes
the written rationale. This keeps cost low (one analysis per match, many rooms) and makes
results honestly different.

| Room (working name) | Market | Selection rule | Expected profile |
|---|---|---|---|
| Safe Bet (ቀላል ምርጫ) | 1X2 | Model prob ≥ 65%, odds 1.25–1.60 | High win rate, low ROI |
| Value Hunter | 1X2 | Model prob exceeds odds-implied prob by ≥ 6 pts, odds 1.80–3.50 | Lower win rate, best ROI potential |
| Goal Rush | Over 2.5 / BTTS Yes | Model expected goals ≥ 2.9 and both teams' scoring rate high | Medium |
| Lockdown | Under 2.5 / BTTS No | Expected goals ≤ 2.2, strong defensive form | Medium |
| Home Fortress | Home win | Home team top-6 home form, opponent poor away form | High win rate |
| Draw Master | Draw (X) | Model draw prob ≥ 32%, tight teams, odds ≥ 3.0 | Low win rate, swingy ROI |

Rules per room: max 3 tips/day, min 1 tip on any matchday with a qualifying fixture,
"no bet" days are allowed and shown (silence is part of discipline). Stake is always 1 unit.

Personas: each room gets a name, avatar, tone, and a short "how I think" page. Clearly
marked "AI strategy" on every surface.

## 4. AI pipeline

Runs as a scheduled job (cron) every morning at 06:00 EAT, with a re-run 2 hours before
kickoff for lineup-sensitive rooms.

```
API-Football ──> ingest (fixtures, standings, form, H2H, injuries, lineups, odds)
      │
      ▼
feature builder (Node)  ──> per-match feature JSON
      │
      ▼
quant model (Node)      ──> Poisson / Dixon-Coles goal model → P(home), P(draw), P(away),
                            P(over 2.5), P(BTTS), expected goals; compared to odds-implied probs
      │
      ▼
Claude (claude-opus-5-5) ──> reads features + model probs + odds, returns STRUCTURED output:
                             pick per market, confidence, key factors, rationale EN + AM,
                             risk flags (injuries, rotation, weather, motivation)
      │
      ▼
room filters            ──> assign qualifying picks to rooms
      │
      ▼
publish                 ──> tip row written with published_at, odds_at_publish, sha256 hash
      │
      ▼
deliver                 ──> web, Telegram channel post, SMS to subscribers
      │
      ▼ (after full time)
settle                  ──> fetch results, mark win/loss/void, compute profit at published odds
      │
      ▼
leaderboard recompute   ──> ROI, win rate, streak, last-30-days, all-time, per room
```

Design notes:
- The **quant model does the math; Claude does the reasoning and writing.** An LLM alone
  does not beat bookmaker margins. The edge, where it exists, comes from the model plus
  odds comparison plus discipline. Claude adds injury/lineup context the Poisson model
  ignores and produces the explanation users pay for.
- One Claude call per match, structured output (JSON schema), adaptive thinking, with
  the server-side refusal fallback enabled. Amharic is generated in the same call.
- Tips are **immutable**: once published, a row cannot be edited. Corrections create a
  new row linked to the old one. The hash and timestamp are shown on the public tip page.
- Settlement uses the odds captured at publish time (shown to the user), which is the
  honest basis for ROI.
- Backtest harness replays the pipeline over the 2025/26 season using historical fixtures
  and odds, labeled "Backtest" everywhere it appears.

Cost estimate (season average ~12–15 matches/day across 6 competitions):
- ~7k input + ~1.5k output tokens per match on claude-opus-5-5 ($4 / $20 per MTok)
  ≈ $0.06/match ≈ $0.80/day ≈ $25/month. Prompt caching on the fixed system prompt lowers this.
- If budget gets tight, claude-sonnet-5-5 ($2 / $10) roughly halves it; claude-haiku-5-5
  ($0.10 / $0.50) is ~40x cheaper but weaker at nuanced reasoning. The plan assumes Opus.

## 5. Data model (Postgres)

- `users` (id, phone, email, telegram_id, locale, created_at)
- `rooms` (id, slug, name_en, name_am, persona, strategy_config JSON, price_etb, active)
- `subscriptions` (id, user_id, room_id, starts_at, ends_at, status, payment_id)
- `payments` (id, user_id, provider chapa|santimpay, tx_ref, amount_etb, status, raw_webhook)
- `fixtures` (id, api_fixture_id, league, home, away, kickoff_at, status, score)
- `match_analyses` (id, fixture_id, features JSON, model_probs JSON, llm_output JSON, run_at)
- `tips` (id, room_id, fixture_id, market, selection, odds_at_publish, confidence,
  rationale_en, rationale_am, published_at, hash, result win|loss|void|pending, profit_units,
  supersedes_tip_id, is_backtest)
- `leaderboard_snapshots` (room_id, period, roi, win_rate, tips_count, profit_units, computed_at)
- `deliveries` (tip_id, user_id, channel web|telegram|sms, sent_at, status)
- `audit_log` (append-only; every admin action)

## 6. Website (Next.js App Router)

Public:
- Landing (bilingual), leaderboard, each room's public page (persona, strategy, full settled
  history, backtest section), tip verification page (`/tips/[id]` with hash + timestamp),
  pricing, how it works, responsible gambling, terms, privacy.
Authenticated:
- Dashboard: today's tips for subscribed rooms, past results, subscription status.
- Checkout: pick room → Chapa hosted checkout → webhook confirms → subscription activated.
- Settings: phone, Telegram link, SMS opt-in, language.
Admin:
- Pipeline run status, manual re-run, tip review (approve/hold before publish, optional),
  payments, user lookup, room config editor.

Auth: phone number + OTP (SMS) as primary since that is the audience's identity; email
optional. Consider Telegram Login as a second option.

## 7. Delivery channels

- **Telegram**: one private channel per room. Bot (grammY) creates single-use invite links
  on subscription activation and removes the user on expiry. Daily tip posted with the
  verification link. Public free channel posts yesterday's results and the leaderboard
  (growth loop).
- **SMS**: AfroMessage or similar Ethio Telecom-backed gateway. Ethiopia permits one-way
  SMS only, so SMS is broadcast (tip summary + link), never two-way. Budget per message;
  keep SMS to one message per room per day, opt-in.
- **Web + push**: PWA with web push as a cheap third channel.

## 8. Payments

- Chapa hosted checkout with webhook (`charge.success`), server-side verification before
  activation. Covers Telebirr, CBE Birr, M-Pesa, cards.
- **Recurring billing is not confirmed on Chapa or SantimPay.** Plan for **manual monthly
  renewal**: reminders at 3 days and 1 day before expiry via Telegram + SMS, one-tap pay link.
  Revisit auto-renew once a provider documents tokenized recurring charges.
- SantimPay as backup provider behind the same `payments` abstraction.
- Pricing per room in ETB: to decide. Suggest a cheap entry room and a premium "all rooms"
  bundle later once the leaderboard has history.

## 9. Compliance and trust

- 18+ gate, responsible-gambling page and footer on every tip, links to help resources.
- No "guaranteed", "sure", "fixed" language anywhere, including Amharic copy. Claude's
  system prompt forbids it and a lint step checks published text.
- Terms: tips are information, not financial advice; no refunds for losing tips; clear
  refund policy for technical failures.
- Keep a legal status memo for Ethiopia with the source of the relaunch/licensing decision
  and update it as ELS publishes rules.
- Data: minimal PII (phone, telegram id), hashed where possible, delete on request.

## 10. Open items and risks

1. **Ethiopia legal status.** As of the latest reports found (late Sept 2026), ELS said
   no licensed operator exists and a relaunch is being prepared with no date. The legal
   memo must cite the ELS notice that re-authorises operators before launch. Until then
   the plan treats the market as "relaunching under strict rules."
2. **Recurring billing** unconfirmed on local gateways (see §8).
3. **Injury data** coverage on API-Football for football is not documented clearly; verify
   the `injuries` endpoint on the free tier during Phase 0.
4. **Expected ROI is modest.** Bookmaker margin is ~5%. Most strategies will hover near
   break-even over a season; some rooms will be negative. The leaderboard will show that.
   The product sells analysis, discipline and transparency, not a money machine. Marketing
   copy must match.
5. **Amharic quality.** Claude's Amharic is good but needs a native review pass on the
   fixed UI copy and a spot-check of generated rationales in week 1.
6. **Naming.** Room and persona names, brand voice, domain.

## 11. Build phases

**Phase 0 — Data and model (week 1–2)**
- Repo scaffold (Next.js, TypeScript, Drizzle, Postgres on Supabase or Neon).
- API-Football ingest for the 6 competitions; fixtures, standings, form, H2H, odds, injuries.
- Poisson/Dixon-Coles model; calibration check against last season.
- Backtest harness producing per-room results for 2025/26, labeled as backtest.
- Exit criterion: backtest report for all six rooms, with ROI and win rate.

**Phase 1 — Pipeline and leaderboard (week 3–4)**
- Claude analysis step with structured output, EN + AM rationale, prompt caching.
- Room filters, publish with hash/timestamp, settlement job, leaderboard recompute.
- Internal admin page to watch runs. Run live daily, unpublished, to collect real history.
- Exit criterion: 14 consecutive days of automated publish → settle with no manual fixes.

**Phase 2 — Website and payments (week 5–7)**
- Public pages, leaderboard, room pages, tip verification pages, bilingual UI.
- Phone OTP auth, Chapa checkout + webhook, subscription gating, renewal reminders.
- Exit criterion: a real test payment activates a room and shows today's tips.

**Phase 3 — Telegram and SMS (week 8)**
- Bot, per-room channels, invite/removal automation, SMS broadcast with opt-in.

**Phase 4 — Soft launch (week 9–10)**
- Publish backtests + the live history collected since Phase 1.
- Invite a small group, collect feedback, fix Amharic copy, tune room thresholds.
- Then public launch with the free results channel as the acquisition engine.

## 12. Monthly cost estimate (pre-revenue)

| Item | Estimate |
|---|---|
| API-Football Pro | $19 |
| Claude (Opus 5.5, ~15 matches/day) | ~$25 |
| Postgres (Supabase/Neon free → $25 tier when needed) | $0–25 |
| Hosting (Vercel hobby/pro, cron) | $0–20 |
| SMS (opt-in, ~1 msg/room/day) | depends on subscribers; budget $10 at launch |
| Domain | ~$1 |
| **Total** | **~$55–100** |

## 13. Next steps

1. You confirm or adjust: room list and names, ETB price per room, Ethiopia legal source.
2. I scaffold the repo and start Phase 0 (ingest + model + backtest harness).

## 14. Phase 0 results (2026-10-12)

Built: Next.js scaffold, Drizzle schema, football-data.co.uk loader, Dixon-Coles model with
time decay, six room filters, settlement, walk-forward backtest, parameter sweep, unit tests.
Reports live in `reports/`. Run `pnpm backtest` to reproduce.

### What the data says

1. **The model alone does not beat the market.** 1X2 log-loss is ~0.99 for the model vs
   ~0.97 for Bet365's margin-removed prices, on both 2024/25 and 2025/26, at every decay
   setting tried. This is the expected result for a public-data Poisson model.
2. **"Edge" from model-vs-market disagreement is noise.** Rooms that bet on it (Value
   Hunter, Draw Master) lost 10–25% per season when run on the raw model.
3. **Blending toward the market fixes the bleed.** With decision probabilities at 80%
   market / 20% model, favorite-based rooms land near the bookmaker margin:
   Safe Bet +4.2% (25/26) and -0.4% (24/25); Home Fortress -2.6% and -7.7%.
   At best-available odds (line shopping) Safe Bet is +4.6% and +0.7%.
4. **Over/Under rooms with the blend tip rarely** (15–45 per season) and swing with
   small samples. Not enough signal to rank on.

### Implications for the product

- Rooms are **strategies with discipline**, not profit machines. Honest expected ROI
  over a season is roughly -5% to +5% for favorite-based rooms. Marketing must say so.
- Value Hunter and Draw Master as "model finds mispricing" do not work on this data.
  Options: (a) redefine Value Hunter as a **line-shopping** room that recommends the
  best available price and shows the price advantage; (b) feed Claude richer inputs
  (injuries, lineups, rest days, motivation) and measure whether its adjustments add
  signal in the live, unpublished period (Phase 1 exit criterion); (c) drop them.
  Recommendation: (a) + (b), decide after 4–6 weeks of live shadow data.
- Final Phase 0 defaults: decay xi=0.002, market blend w=0.8, two prior seasons.
- Phase 1 must include a **shadow period**: publish internally, settle, and compare
  Claude-adjusted picks against the blended model before any user pays.

## 15. Phase 1 status (2026-10-12)

Built and dry-run end to end against mock API data (no keys were available in the session):

- `pipeline/data/api-football.ts`: API-Football v3 client, disk cache per request, mock mode.
- `pipeline/live/ingest.ts`: today's fixtures for the 6 competitions, current + previous
  season history, standings. ~18 requests/day plus 2 per fixture (odds, injuries).
- `pipeline/live/analyze.ts`: pooled Dixon-Coles fit on all finished fixtures in the DB
  (domestic + UCL together, so ratings connect across leagues), match packet (form, rest,
  H2H, standings, injuries, odds, implied, raw + blended probs), Claude call, stored in
  `match_analyses`. One Claude call per match, structured output, cached system prompt,
  refusal fallback enabled.
- `pipeline/live/publish.ts`: room filters → immutable tips with sha256 hash, for two
  bases: `model` (blended probabilities) and `claude` (Claude's final probabilities).
  Both are stored; the public leaderboard will show one. This is the shadow comparison.
- `pipeline/live/settle.ts`, `leaderboard.ts`: results refresh, settlement, snapshots per
  room × basis × period (all / 30d / 7d) plus a separate `backtest` period.
- `pipeline/live/import-backtest.ts`: both backtest reports imported as labeled tips.
- `pipeline/live/explain.ts`: shows per-room decisions for a date (ops/debug).
- Local Postgres 16 via mise on port 5433 (`.pgdata/`, ignored); migration 0000 applied.

Decisions made in Phase 1:
- BTTS is now a market for Goal Rush / Lockdown (live only; the CSV backtest has no BTTS odds).
- All markets, including BTTS, are blended toward the bookmaker before any room decides.
- Analysis per fixture is "latest wins"; `--refresh` re-runs it.

To go live:
1. Create an API-Football account, put the key in `.env` as `API_FOOTBALL_KEY`, run
   `pnpm af:status` to confirm the plan and daily limit, and check whether the free tier
   returns the 2026 season (if it only returns older seasons, the Pro plan is required for
   live tips).
2. Put `ANTHROPIC_API_KEY` in `.env`. The default model is `claude-opus-5-5`.
3. Run `pnpm live:daily` once by hand, then schedule it daily (06:00 EAT) and the
   settle/leaderboard step late evening (`pnpm live:daily --only settle` then `--only leaderboard`).
4. Shadow period: 4–6 weeks unpublished. Exit criterion: compare `model` vs `claude`
   bases on the leaderboard output and decide the public basis and whether Value Hunter
   and Draw Master survive.

Not in Phase 1: room-persona rewrites of the rationale (would need a second, cheaper LLM
call per tip), the admin web page (moves to Phase 2 with auth), hosted scheduling.

## 16. First real run with keys (2026-10-12)

API-Football account confirmed: **Free plan, 100 requests/day, 10 requests/minute.**
Free-plan limits discovered by probing:

- Seasons: only **2022 to 2024**. The 2026/27 season is refused (`Free plans do not have
  access to this season, try from 2022 to 2024`).
- The `date` parameter is limited to a three-day window around today.
- Rate limit errors arrive as HTTP 200 with `errors.rateLimit`, not only HTTP 429.

Pipeline changes made as a result: the day's fixtures are derived from the uncached
current-season fetch (no by-date request), requests are spaced to the plan's per-minute
limit (`API_FOOTBALL_RPM`), rate limits and network errors are retried with backoff, and
optional feeds (odds, injuries) fail soft.

Validation on real 2024 data (`pnpm live:daily --date 2024-10-19 --limit 2 --allow-finished`):
24 fixtures across the 6 competitions, 4,005 history rows, model fit on 4,066 matches
(home advantage 0.205, rho -0.11), two real Claude Opus 5.5 analyses stored. No odds were
returned for past fixtures (API-Football only serves pre-match odds in a window before
kickoff), so no tips were generated; that is expected and not a bug.

**Live tips for the current season require the Pro plan (~$19/month), or the free
multi-provider setup described in §17.**
The free plan cannot see 2026/27 fixtures at all. Until then, `pnpm live:daily` will ingest
nothing for today.

## 17. Multi-provider data strategy (2026-10-12)

API-Football's free plan cannot serve the current season, so the live pipeline now runs on
a **provider registry** (`pipeline/providers/`) that combines free sources per data role
and alternates between them by priority, quota and health:

| Role | Order | Notes |
|---|---|---|
| Fixtures / results | football-data.org → ESPN → OpenLigaDB | football-data.org needs a free token (all 6 comps, 10 req/min). ESPN is unofficial but complete, one request per competition per day. OpenLigaDB is keyless but lags on results and lacks Serie A / Ligue 1. |
| Standings | football-data.org → OpenLigaDB | Without the token, Serie A and Ligue 1 standings are missing. |
| Odds | The Odds API → ESPN (DraftKings) | The Odds API free plan: 500 credits/month, h2h + totals for 6 leagues daily ≈ 360. ESPN gives 1X2 and the 2.5 total for free. BTTS needs a paid feed. |
| History (model) | football-data.co.uk CSVs (big five) + OpenLigaDB (UCL) | Free and complete. |
| Injuries | none | Needs API-Football Pro. The prompt tells Claude team news was not checked. |

Fixtures are keyed by **canonical team names** (`pipeline/data/teams.ts`, ~150 clubs with
aliases for every provider's spelling); unmatched names are logged, never guessed.
Per-provider usage is tracked in `provider_usage`; `odds_snapshots` stores every odds
capture so analysis is decoupled from fetching.

First real run on 2026-10-12 with no keys at all: 4 fixtures, 22 odds snapshots, model fit
on 2,252 matches, Claude analysis stored. All 17 unit tests pass.

Recommended free sign-ups (both optional, both improve coverage):
1. football-data.org token → fills Serie A and Ligue 1 standings and removes the ESPN dependency.
2. The Odds API key → bookmaker-grade odds instead of DraftKings via ESPN.

## 18. Phase 2 status: website (2026-10-12)

Built and verified in the browser against the local database:

- **Design**: dark editorial data look, one gold accent, win/loss in green/red, tabular
  monospace numbers, Bricolage Grotesque display type, Noto Sans Ethiopic for Amharic.
  No gradients, no stock imagery; the leaderboard is the hero.
- **Public pages**: home (leaderboard + rooms + how verification works), `/leaderboard`
  with period tabs (all / 30d / 7d / backtest), `/rooms`, `/rooms/[slug]` (stats, equity
  curve, upcoming and settled tips, subscribe panel), `/tips/[id]` (verification page with
  hash and UTC timestamps; pick locked before kickoff unless subscribed), how it works,
  responsible gambling, terms and privacy drafts, 404.
- **Auth**: phone number + one-time code. Delivery is pluggable; in development the code
  is printed to the server log and shown on the page (`OTP_DEV_SHOW=1`). Session is an
  HMAC-signed cookie (`SESSION_SECRET`).
- **Payments**: Chapa hosted checkout (initialize → redirect → return page verifies →
  webhook verifies again, HMAC-checked). Without `CHAPA_SECRET_KEY` the checkout activates
  immediately in development only. Subscriptions are 30 days, no auto-renew; a renewal
  extends from the current end date.
- **Dashboard**: today's picks for subscribed rooms, subscription list with expiry and renew.
- **Admin** (`users.is_admin`): counts, provider usage, recent analyses.
- **Bilingual**: English/Amharic toggle via cookie; room names, labels and rationales switch.

Verified end to end in the browser: login with a test number → dev checkout → "Payment
confirmed" → dashboard shows the active room. All pages return 200; tsc and lint clean.

Open items for launch: real room prices (placeholder 299 ETB in the database), Chapa live
keys, an SMS provider for the OTP (Phase 3), legal review of terms and privacy, hosting.

### Chapa integration check (2026-10-12)

- `.env` holds a **test-mode secret key** (`CHASECK_TEST-…`). The public key and encryption
  key Chapa also shows are only for inline/encrypted card flows; hosted checkout does not use them.
- The **webhook secret is not a key Chapa gives you**: it is a "secret hash" you type into
  Dashboard → Settings → Webhooks together with the webhook URL
  (`https://<domain>/api/webhooks/chapa`). Put the same string in `CHAPA_WEBHOOK_SECRET`.
  Until then the code verifies signatures against the secret key, which Chapa's own example uses.
- Chapa calls `callback_url` with a **GET** (`trx_ref`, `ref_id`, `status`); the route now
  accepts that and re-verifies the transaction through the API before activating anything.
- Verified end to end with the test key: initialize → hosted test checkout (published test
  number 0900123456, "Test Bank Payment") → return page → API verify → subscription activated.

## 19. Phase 3: Telegram and SMS (2026-10-12)

**Telegram** (`src/lib/telegram*.ts`, `pipeline/delivery/deliver.ts`), thin Bot API client, no SDK:
- One private channel per room (`rooms.telegram_channel_id`, bot is admin). On activation a
  **single-use invite link** (member_limit 1, 7-day expiry) is created per subscription and
  shown on the dashboard and in the bot DM. Joins via that link are matched back to the
  subscription (`chat_member` updates), so the member's Telegram id is known.
- **Account linking**: dashboard "Connect Telegram" opens `t.me/<bot>?start=<signed token>`;
  the bot verifies the HMAC and stores `users.telegram_id`.
- **Daily**: every new tip is posted to its room channel (idempotent via `deliveries`);
  a public results post (yesterday's settled tips + leaderboard link) goes to
  `TELEGRAM_PUBLIC_CHANNEL_ID`; reminders at 3 days and 1 day before expiry by DM;
  lapsed subscriptions are set to expired and the member is removed (ban + unban so they
  can re-join after renewing).
- Updates arrive via `/api/telegram/webhook` (secret-token checked) in production, or
  `pnpm telegram:poll` locally.

**SMS** (`src/lib/sms.ts`): provider interface with AfroMessage (Ethio Telecom-backed) and a
console fallback. Used for the login code, one text per room per matchday to opted-in
subscribers (GSM-7 friendly, ≤ 3 picks + link), and renewal reminders. Opt-in lives on the
dashboard. Every send is logged in `deliveries`.

Pipeline steps added to `pnpm live:daily`: `deliver` (after publish), `results` and
`expiry` (after leaderboard).

Setup still needed: a BotFather token, the channel ids, and an AfroMessage account
(token, identifier, sender name). Everything runs in mock mode until then.

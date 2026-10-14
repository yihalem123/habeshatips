# HabeshaTips

Soccer betting tips with a verifiable record. Six AI strategy rooms publish picks for the big
five European leagues and the Champions League before kickoff. Every tip is hashed, timestamped
and settled in public, and a leaderboard ranks the rooms by return on investment over that
record. Subscribers get the picks on the web, in private Telegram channels and by SMS, with
analysis written in English and Amharic.

## How it works

1. **Data.** A provider registry pulls fixtures, results, standings and bookmaker odds from
   free sources (football-data.org, ESPN, OpenLigaDB, The Odds API, football-data.co.uk) and
   alternates between them by priority, quota and health. Teams are keyed by canonical names
   so sources can be mixed.
2. **Model.** A Dixon-Coles goal model, refitted daily on two seasons with time decay, gives
   match probabilities. They are blended 80/20 toward the bookmaker's margin-removed prices,
   because the market is the stronger forecaster.
3. **Analysis.** Claude reads the match packet (model output, odds, form, rest, head-to-head,
   standings) and returns structured probabilities plus a bilingual rationale.
4. **Rooms.** Each room is a fixed rule set over the same analysis: minimum probability, odds
   range, expected value, evidence on both teams, daily cap. No pick is a valid output.
5. **Record.** Tips are written with the odds at publish time, a UTC timestamp and a SHA-256
   hash, then settled at those odds with flat one-unit stakes. The leaderboard is arithmetic
   over that record.

Walk-forward backtests over two seasons are published and labelled as backtests. They show
that public-data strategies land near the bookmaker margin; the product sells discipline and
transparency, not guaranteed profit.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Drizzle ORM on Postgres 16, the
Anthropic SDK for analysis, Chapa for payments, a thin Telegram Bot API client, AfroMessage
for SMS. The pipeline runs as scheduled scripts with `tsx`; the site is a standard Next.js app.

```
pipeline/
  data/        historical CSV loader, team canonicalisation, form helpers
  model/       Dixon-Coles model, odds helpers, market blending
  rooms/       room definitions and settlement
  backtest/    walk-forward backtest and parameter sweep
  providers/   data providers and the registry
  analysis/    Claude prompt, output schema and client
  live/        ingest, analyze, publish, settle, leaderboard, daily orchestrator
  delivery/    Telegram posts, SMS, reminders, expiry
src/
  app/         pages and API routes
  components/  UI
  db/          schema and client
  lib/         i18n, session, OTP, payments, Telegram, SMS, queries
docs/          design document and provider pricing notes
reports/       backtest reports
```

## Getting started

Requirements: Node 22, pnpm, Postgres 16.

```bash
pnpm install
cp .env.example .env            # fill in DATABASE_URL and the keys you have
docker compose up -d            # local Postgres, or point DATABASE_URL at your own
pnpm db:migrate
pnpm fetch:fd                   # historical results and odds (2023/24 onward)
pnpm test
pnpm dev                        # http://localhost:3000
```

The site runs with no data keys at all; the pipeline uses keyless sources by default.
Optional free keys improve coverage: `FOOTBALL_DATA_ORG_TOKEN` (all six competitions,
standings) and `THE_ODDS_API_KEY` (bookmaker-grade odds). `ANTHROPIC_API_KEY` is required
for written analysis; without it the pipeline publishes model picks with a short placeholder.

### Backtests

```bash
pnpm backtest --season 2526 --odds open
npx tsx pipeline/backtest/sweep.ts --season 2526
```

Options: `--odds open|close|max`, `--blend 0.8`, `--xi 0.002`, `--history 2`, `--leagues E0,SP1`.

### Daily pipeline

```bash
pnpm live:daily                 # ingest → analyze → publish → deliver → settle → leaderboard
pnpm live:daily --only settle   # evening: refresh results and settle
pnpm live:daily --only expiry   # reminders and channel removal for lapsed subscriptions
npx tsx pipeline/live/explain.ts --date 2026-10-17   # per-room decisions for a date
```

Suggested schedule (times in UTC; 06:00 and 23:30 in Addis Ababa):

```
0 3 * * *   cd /path/to/habeshatips && pnpm live:daily >> logs/daily.log 2>&1
30 20 * * * cd /path/to/habeshatips && pnpm live:daily --only settle && pnpm live:daily --only leaderboard
```

### Payments

Chapa hosted checkout. Set `CHAPA_SECRET_KEY` (test or live), choose a webhook secret hash in
the Chapa dashboard and store it as `CHAPA_WEBHOOK_SECRET`, and point the dashboard webhook at
`https://<domain>/api/webhooks/chapa`. Without a secret key, checkout activates subscriptions
immediately in development only.

### Telegram and SMS

1. Create a bot with @BotFather and set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
2. Create a private channel per room and a public results channel; make the bot an admin.
   Store room channel ids in `rooms.telegram_channel_id` and the public one as
   `TELEGRAM_PUBLIC_CHANNEL_ID`.
3. Receive updates with `pnpm telegram:poll` locally, or register the webhook in production:
   `setWebhook?url=https://<domain>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>&allowed_updates=["message","chat_member"]`.
4. SMS: set `AFROMESSAGE_TOKEN`, `AFROMESSAGE_IDENTIFIER` and `AFROMESSAGE_SENDER`. Login
   codes, matchday picks (opt-in) and reminders are sent through it.

`TELEGRAM_MOCK=1` and `SMS_MOCK=1` log deliveries instead of sending.

### Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js site |
| `pnpm test` | unit tests (vitest) |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | Drizzle migrations |
| `pnpm fetch:fd` | download historical CSVs |
| `pnpm backtest` | walk-forward backtest |
| `pnpm live:daily` | daily pipeline |
| `pnpm live:seed` | upsert room definitions |
| `pnpm live:import-backtest <report.json>` | import a backtest as labelled tips |
| `pnpm telegram:poll` | local bot update loop |
| `pnpm af:status` | API-Football account status (optional provider) |

## Principles

- Rooms are AI strategies and are labelled as such everywhere. No invented tipsters, no
  fabricated records.
- Tips are immutable once published. Corrections create a new tip that references the original.
- Backtests are always marked as backtests and kept separate from live results.
- No tip is ever described as certain, safe or guaranteed. 18+ only.

## Documentation

- [docs/PLAN.md](docs/PLAN.md): product and technical design, phase notes and findings.
- [docs/data-providers.md](docs/data-providers.md): data and odds provider comparison.

## License

Copyright © 2026 HabeshaTips. All rights reserved. See [LICENSE](LICENSE).

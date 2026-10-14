import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const localeEnum = pgEnum("locale", ["en", "am"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["pending", "active", "expired", "cancelled"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["chapa", "santimpay", "manual"]);
export const paymentStatusEnum = pgEnum("payment_status", ["initiated", "success", "failed", "refunded"]);
export const fixtureStatusEnum = pgEnum("fixture_status", ["scheduled", "live", "finished", "postponed", "cancelled"]);
export const marketEnum = pgEnum("market", ["1X2", "OU25", "BTTS"]);
export const tipResultEnum = pgEnum("tip_result", ["pending", "win", "loss", "void"]);
export const tipBasisEnum = pgEnum("tip_basis", ["model", "claude"]);
export const deliveryChannelEnum = pgEnum("delivery_channel", ["web", "telegram", "sms"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["queued", "sent", "failed"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    phone: text("phone"),
    email: text("email"),
    telegramId: text("telegram_id"),
    telegramUsername: text("telegram_username"),
    locale: localeEnum("locale").notNull().default("en"),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_phone_idx").on(t.phone), uniqueIndex("users_telegram_idx").on(t.telegramId)],
);

/** One-time login codes (phone OTP). Delivery is pluggable: console in dev, SMS later. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)],
);

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAm: text("name_am").notNull(),
  persona: text("persona").notNull(),
  /** Strategy thresholds; the code in pipeline/rooms/config.ts is the source of truth. */
  strategyConfig: jsonb("strategy_config").notNull().default({}),
  priceEtb: integer("price_etb").notNull(),
  telegramChannelId: text("telegram_channel_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: paymentProviderEnum("provider").notNull(),
  txRef: text("tx_ref").notNull().unique(),
  amountEtb: integer("amount_etb").notNull(),
  status: paymentStatusEnum("status").notNull().default("initiated"),
  rawWebhook: jsonb("raw_webhook"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    roomId: text("room_id").notNull().references(() => rooms.id),
    paymentId: text("payment_id").references(() => payments.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    /** Single-use Telegram invite link for the room channel, created on activation. */
    telegramInviteLink: text("telegram_invite_link"),
    /** Which reminders were sent: e.g. ["3d","1d"]. */
    remindersSent: jsonb("reminders_sent").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_room_idx").on(t.userId, t.roomId)],
);

export const fixtures = pgTable(
  "fixtures",
  {
    id: text("id").primaryKey(),
    /** Provider ids, e.g. { apiFootball: 123, footballDataOrg: 456, openLigaDb: 789, theOddsApi: "abc" }. */
    externalIds: jsonb("external_ids").notNull().default({}),
    apiFootballId: integer("api_football_id").unique(),
    leagueCode: text("league_code").notNull(),
    leagueName: text("league_name").notNull(),
    season: text("season").notNull(),
    home: text("home").notNull(),
    away: text("away").notNull(),
    homeTeamId: integer("home_team_id"),
    awayTeamId: integer("away_team_id"),
    round: text("round"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    status: fixtureStatusEnum("status").notNull().default("scheduled"),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fixtures_kickoff_idx").on(t.kickoffAt)],
);

export const oddsSnapshots = pgTable(
  "odds_snapshots",
  {
    id: text("id").primaryKey(),
    fixtureId: text("fixture_id").notNull().references(() => fixtures.id),
    provider: text("provider").notNull(),
    bookmaker: text("bookmaker"),
    h: numeric("h", { precision: 7, scale: 3 }),
    d: numeric("d", { precision: 7, scale: 3 }),
    a: numeric("a", { precision: 7, scale: 3 }),
    over25: numeric("over25", { precision: 7, scale: 3 }),
    under25: numeric("under25", { precision: 7, scale: 3 }),
    bttsYes: numeric("btts_yes", { precision: 7, scale: 3 }),
    bttsNo: numeric("btts_no", { precision: 7, scale: 3 }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("odds_snapshots_fixture_idx").on(t.fixtureId, t.capturedAt)],
);

/** Per-provider request accounting so free quotas are respected and providers can alternate. */
export const providerUsage = pgTable(
  "provider_usage",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    /** YYYY-MM-DD for daily budgets, YYYY-MM for monthly ones. */
    period: text("period").notNull(),
    requests: integer("requests").notNull().default(0),
    /** Credits for providers that meter by credit (The Odds API). */
    credits: integer("credits").notNull().default(0),
    lastError: text("last_error"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("provider_usage_provider_period_idx").on(t.provider, t.period)],
);

export const matchAnalyses = pgTable("match_analyses", {
  id: text("id").primaryKey(),
  fixtureId: text("fixture_id").notNull().references(() => fixtures.id),
  features: jsonb("features").notNull(),
  modelProbs: jsonb("model_probs").notNull(),
  oddsSnapshot: jsonb("odds_snapshot"),
  llmOutput: jsonb("llm_output"),
  llmModel: text("llm_model"),
  llmUsage: jsonb("llm_usage"),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tips = pgTable(
  "tips",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id),
    fixtureId: text("fixture_id").notNull().references(() => fixtures.id),
    analysisId: text("analysis_id").references(() => matchAnalyses.id),
    market: marketEnum("market").notNull(),
    selection: text("selection").notNull(),
    /** Which probability set produced the pick; the public leaderboard uses one basis. */
    basis: tipBasisEnum("basis").notNull().default("model"),
    oddsAtPublish: numeric("odds_at_publish", { precision: 7, scale: 3 }).notNull(),
    modelProb: numeric("model_prob", { precision: 6, scale: 4 }).notNull(),
    confidence: integer("confidence"),
    rationaleEn: text("rationale_en").notNull(),
    rationaleAm: text("rationale_am").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    /** sha256 over (room, fixture, market, selection, odds, published_at). Immutable once written. */
    hash: text("hash").notNull(),
    result: tipResultEnum("result").notNull().default("pending"),
    profitUnits: numeric("profit_units", { precision: 8, scale: 3 }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    supersedesTipId: text("supersedes_tip_id"),
    isBacktest: boolean("is_backtest").notNull().default(false),
  },
  (t) => [
    index("tips_room_published_idx").on(t.roomId, t.publishedAt),
    index("tips_fixture_idx").on(t.fixtureId),
    uniqueIndex("tips_room_fixture_market_basis_idx").on(t.roomId, t.fixtureId, t.market, t.basis),
  ],
);

export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id),
    period: text("period").notNull(), // all | 30d | 7d | backtest
    tipsCount: integer("tips_count").notNull(),
    wins: integer("wins").notNull(),
    profitUnits: numeric("profit_units", { precision: 10, scale: 3 }).notNull(),
    roi: numeric("roi", { precision: 7, scale: 4 }).notNull(),
    winRate: numeric("win_rate", { precision: 6, scale: 4 }).notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leaderboard_room_period_idx").on(t.roomId, t.period, t.computedAt)],
);

export const deliveryKindEnum = pgEnum("delivery_kind", ["tip", "otp", "reminder", "results", "link"]);

export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),
  kind: deliveryKindEnum("kind").notNull().default("tip"),
  tipId: text("tip_id").references(() => tips.id),
  userId: text("user_id").references(() => users.id),
  /** Room channel or public channel id for Telegram posts. */
  target: text("target"),
  channel: deliveryChannelEnum("channel").notNull(),
  status: deliveryStatusEnum("status").notNull().default("queued"),
  providerRef: text("provider_ref"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

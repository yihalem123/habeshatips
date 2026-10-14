CREATE TYPE "public"."delivery_channel" AS ENUM('web', 'telegram', 'sms');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fixture_status" AS ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'am');--> statement-breakpoint
CREATE TYPE "public"."market" AS ENUM('1X2', 'OU25', 'BTTS');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('chapa', 'santimpay', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('initiated', 'success', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tip_basis" AS ENUM('model', 'claude');--> statement-breakpoint
CREATE TYPE "public"."tip_result" AS ENUM('pending', 'win', 'loss', 'void');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"tip_id" text NOT NULL,
	"user_id" text,
	"channel" "delivery_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'queued' NOT NULL,
	"provider_ref" text,
	"sent_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" text PRIMARY KEY NOT NULL,
	"api_football_id" integer,
	"league_code" text NOT NULL,
	"league_name" text NOT NULL,
	"season" text NOT NULL,
	"home" text NOT NULL,
	"away" text NOT NULL,
	"home_team_id" integer,
	"away_team_id" integer,
	"round" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" "fixture_status" DEFAULT 'scheduled' NOT NULL,
	"home_goals" integer,
	"away_goals" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_api_football_id_unique" UNIQUE("api_football_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"period" text NOT NULL,
	"tips_count" integer NOT NULL,
	"wins" integer NOT NULL,
	"profit_units" numeric(10, 3) NOT NULL,
	"roi" numeric(7, 4) NOT NULL,
	"win_rate" numeric(6, 4) NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"fixture_id" text NOT NULL,
	"features" jsonb NOT NULL,
	"model_probs" jsonb NOT NULL,
	"odds_snapshot" jsonb,
	"llm_output" jsonb,
	"llm_model" text,
	"llm_usage" jsonb,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"tx_ref" text NOT NULL,
	"amount_etb" integer NOT NULL,
	"status" "payment_status" DEFAULT 'initiated' NOT NULL,
	"raw_webhook" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "payments_tx_ref_unique" UNIQUE("tx_ref")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_am" text NOT NULL,
	"persona" text NOT NULL,
	"strategy_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_etb" integer NOT NULL,
	"telegram_channel_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"room_id" text NOT NULL,
	"payment_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"analysis_id" text,
	"market" "market" NOT NULL,
	"selection" text NOT NULL,
	"basis" "tip_basis" DEFAULT 'model' NOT NULL,
	"odds_at_publish" numeric(7, 3) NOT NULL,
	"model_prob" numeric(6, 4) NOT NULL,
	"confidence" integer,
	"rationale_en" text NOT NULL,
	"rationale_am" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hash" text NOT NULL,
	"result" "tip_result" DEFAULT 'pending' NOT NULL,
	"profit_units" numeric(8, 3),
	"settled_at" timestamp with time zone,
	"supersedes_tip_id" text,
	"is_backtest" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text,
	"email" text,
	"telegram_id" text,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_tip_id_tips_id_fk" FOREIGN KEY ("tip_id") REFERENCES "public"."tips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_analyses" ADD CONSTRAINT "match_analyses_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_analysis_id_match_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."match_analyses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixtures_kickoff_idx" ON "fixtures" USING btree ("kickoff_at");--> statement-breakpoint
CREATE INDEX "leaderboard_room_period_idx" ON "leaderboard_snapshots" USING btree ("room_id","period","computed_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_room_idx" ON "subscriptions" USING btree ("user_id","room_id");--> statement-breakpoint
CREATE INDEX "tips_room_published_idx" ON "tips" USING btree ("room_id","published_at");--> statement-breakpoint
CREATE INDEX "tips_fixture_idx" ON "tips" USING btree ("fixture_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tips_room_fixture_market_basis_idx" ON "tips" USING btree ("room_id","fixture_id","market","basis");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_telegram_idx" ON "users" USING btree ("telegram_id");
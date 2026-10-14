CREATE TABLE "odds_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"fixture_id" text NOT NULL,
	"provider" text NOT NULL,
	"bookmaker" text,
	"h" numeric(7, 3),
	"d" numeric(7, 3),
	"a" numeric(7, 3),
	"over25" numeric(7, 3),
	"under25" numeric(7, 3),
	"btts_yes" numeric(7, 3),
	"btts_no" numeric(7, 3),
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"period" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "odds_snapshots_fixture_idx" ON "odds_snapshots" USING btree ("fixture_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_usage_provider_period_idx" ON "provider_usage" USING btree ("provider","period");
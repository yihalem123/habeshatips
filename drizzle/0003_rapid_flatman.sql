CREATE TYPE "public"."delivery_kind" AS ENUM('tip', 'otp', 'reminder', 'results', 'link');--> statement-breakpoint
ALTER TABLE "deliveries" ALTER COLUMN "tip_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "kind" "delivery_kind" DEFAULT 'tip' NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "target" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "telegram_invite_link" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "reminders_sent" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_username" text;
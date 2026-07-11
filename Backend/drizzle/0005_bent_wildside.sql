ALTER TABLE "users" ADD COLUMN "auto_renew" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "minimum_order_value" double precision;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "deleted_at" timestamp;
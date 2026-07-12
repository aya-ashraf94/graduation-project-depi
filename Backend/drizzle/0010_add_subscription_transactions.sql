CREATE TABLE "subscription_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"amount" double precision NOT NULL,
	"billing_cycle" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"stripe_payment_intent_id" text,
	"tier_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_transactions" ADD CONSTRAINT "subscription_transactions_tier_id_seller_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."seller_tiers"("id") ON DELETE set null ON UPDATE no action;
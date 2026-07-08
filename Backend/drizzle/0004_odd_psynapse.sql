CREATE TABLE "refund_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"duration" integer NOT NULL,
	"amount_paid" double precision NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fee_percent" double precision,
	"monthly_price" double precision DEFAULT 0 NOT NULL,
	"yearly_price" double precision DEFAULT 0 NOT NULL,
	"featured_listings_included" integer DEFAULT 0 NOT NULL,
	"badge_label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seller_tiers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refund_order_idx" ON "refund_requests" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refund_buyer_idx" ON "refund_requests" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "featured_product_idx" ON "featured_listings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "featured_seller_idx" ON "featured_listings" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "featured_active_idx" ON "featured_listings" USING btree ("is_active","end_date");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tier_id_seller_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."seller_tiers"("id") ON DELETE set null ON UPDATE no action;
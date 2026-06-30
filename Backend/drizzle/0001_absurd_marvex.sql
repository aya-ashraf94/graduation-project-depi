ALTER TABLE "products" ADD COLUMN "min_price" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "original_price" double precision;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "flash_sale_discount" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "category_sale_discount" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_discount" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "offer_amount" double precision;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_uses" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "used_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_per_user" integer;
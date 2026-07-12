ALTER TABLE "products" ADD COLUMN "reserved_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reserved_by" uuid;--> statement-breakpoint
CREATE INDEX "order_buyer_created_at_idx" ON "orders" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "order_seller_created_at_idx" ON "orders" USING btree ("seller_id","created_at");
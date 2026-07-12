ALTER TABLE "seller_tiers" ADD COLUMN "free_featured_duration" integer DEFAULT 7;

-- Set sensible durations per tier
UPDATE "seller_tiers" SET "free_featured_duration" = 2  WHERE "name" = 'Bronze';
UPDATE "seller_tiers" SET "free_featured_duration" = 7  WHERE "name" = 'Silver';
UPDATE "seller_tiers" SET "free_featured_duration" = 7  WHERE "name" = 'Gold';
UPDATE "seller_tiers" SET "free_featured_duration" = 7  WHERE "name" = 'Free';

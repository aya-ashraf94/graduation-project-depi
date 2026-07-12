ALTER TABLE "seller_tiers" ADD COLUMN "monthly_promotion_credits" double precision DEFAULT 0;

UPDATE "seller_tiers" SET "monthly_promotion_credits" = 5   WHERE "name" = 'Bronze';
UPDATE "seller_tiers" SET "monthly_promotion_credits" = 12  WHERE "name" = 'Silver';
UPDATE "seller_tiers" SET "monthly_promotion_credits" = 25  WHERE "name" = 'Gold';

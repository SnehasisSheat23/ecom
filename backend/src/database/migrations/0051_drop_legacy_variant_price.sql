-- Migration 0051: Drop legacy price and compare_at_price columns from variants table

ALTER TABLE "variants" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "variants" DROP COLUMN IF EXISTS "price";
ALTER TABLE "variants" DROP COLUMN IF EXISTS "compare_at_price";

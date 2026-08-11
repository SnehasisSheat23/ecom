-- Add catalog_type column to products table
ALTER TABLE "products" ADD COLUMN "catalog_type" varchar(20) DEFAULT 'REGULAR' NOT NULL;

-- Mark the Corporate Custom Gift Box as a BUNDLE
-- This ensures it is hidden from the main shop grid but stays available for the Gift builder
UPDATE "products" 
SET "catalog_type" = 'BUNDLE' 
WHERE "id" = '3534c58c-493a-4147-a3f0-ebb8ec70f4e4';

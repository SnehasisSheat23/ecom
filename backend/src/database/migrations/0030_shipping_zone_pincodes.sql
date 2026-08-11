-- Migration: Add pincodes to shipping_zones
ALTER TABLE "shipping_zones" ADD COLUMN "pincodes" jsonb NOT NULL DEFAULT '[]'::jsonb;

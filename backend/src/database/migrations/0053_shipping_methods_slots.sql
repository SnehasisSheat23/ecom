-- Migration: Add slots JSONB column to shipping_methods
ALTER TABLE "shipping_methods" ADD COLUMN IF NOT EXISTS "slots" jsonb NOT NULL DEFAULT '[]'::jsonb;

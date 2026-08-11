-- Migration: Add priority column to fulfillment_service_areas
ALTER TABLE "fulfillment_service_areas" ADD COLUMN IF NOT EXISTS "priority" integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_fulfillment_service_areas_priority ON fulfillment_service_areas(code, priority);

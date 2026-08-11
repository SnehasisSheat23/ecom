-- Migration 0052: Better Auth Standard Schema Sync for Users & Sessions

ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "name" varchar(255),
ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS "image" varchar(500);

-- Backfill name column from first_name and last_name if present
UPDATE "users" 
SET "name" = TRIM(COALESCE("first_name", '') || ' ' || COALESCE("last_name", ''))
WHERE "name" IS NULL OR "name" = '';

ALTER TABLE "user_sessions"
ADD COLUMN IF NOT EXISTS "ip_address" varchar(45),
ADD COLUMN IF NOT EXISTS "user_agent" text;

-- Migration 0044: Sync partners table status to partner_status enum
-- and add any missing columns from Drizzle schema

-- Create partner_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE partner_status AS ENUM ('onboarding', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to partners table if not already present
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address JSONB;

-- Add unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_partner_slug_tenant'
  ) THEN
    ALTER TABLE partners ADD CONSTRAINT uq_partner_slug_tenant UNIQUE (tenant_id, slug);
  END IF;
END $$;

-- Ensure idx_partners_tenant index exists
CREATE INDEX IF NOT EXISTS idx_partners_tenant ON partners(tenant_id);

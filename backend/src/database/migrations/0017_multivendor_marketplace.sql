-- ============================================================
-- 0017: Multi-Vendor Marketplace Enhancements
--
-- Adds:
--   1. Product approval workflow (approvalStatus + rejectionReason)
--   2. Vendor settlement tracking table
--   3. Vendor service area (pincode) mapping table
--   4. Links vendor_ledger to settlements
--
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- 1. Product Approval Workflow
-- ----------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(1000);

-- Backfill: Tenant-owned products (no vendor) should be auto-approved
UPDATE products
  SET approval_status = 'APPROVED'
  WHERE vendor_id IS NULL
    AND approval_status = 'PENDING';

-- 2. Vendor Settlements Table
-- ----------------------------
CREATE TABLE IF NOT EXISTS vendor_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  payout_provider_id VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_settlements_vendor
  ON vendor_settlements(vendor_id, status);

-- 3. Vendor Service Areas (Pincode Mapping)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  pincode VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_service_area
  ON vendor_service_areas(tenant_id, vendor_id, pincode);

CREATE INDEX IF NOT EXISTS idx_vendor_service_areas_pincode
  ON vendor_service_areas(tenant_id, pincode);

-- 4. Link Vendor Ledger to Settlements
-- --------------------------------------
ALTER TABLE vendor_ledger
  ADD COLUMN IF NOT EXISTS settlement_id UUID;

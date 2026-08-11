-- Migration 0045: Sync all Drizzle schema columns missing from the actual DB
-- Covers: customers (partner_id, supabase_auth_id, tier_id, gdpr fields)
-- and any other column drift detected from seed failures

-- customers: add missing columns
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS partner_id UUID,
  ADD COLUMN IF NOT EXISTS supabase_auth_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS gdpr_deletion_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tier_id UUID,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Ensure supabase_auth_id index exists
CREATE INDEX IF NOT EXISTS idx_customers_supabase_auth ON customers(supabase_auth_id);
CREATE INDEX IF NOT EXISTS idx_customers_active_list ON customers(tenant_id, is_admin, created_at);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_vendor ON customers(tenant_id, partner_id);

-- Drop the existing unique constraint and unique index
ALTER TABLE variants DROP CONSTRAINT IF EXISTS uq_variant_sku_tenant;
DROP INDEX IF EXISTS uq_variant_sku_tenant;

-- Create the new partial unique index
CREATE UNIQUE INDEX uq_variant_sku_tenant ON variants(tenant_id, sku) WHERE deleted_at IS NULL;

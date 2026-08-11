ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS vendor_id UUID;

CREATE INDEX IF NOT EXISTS idx_customers_tenant_vendor ON customers(tenant_id, vendor_id);

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS vendor_id UUID;

ALTER TABLE inventory_history
  ADD COLUMN IF NOT EXISTS vendor_id UUID;

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_vendor ON inventory(tenant_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_tenant_vendor ON inventory_history(tenant_id, vendor_id);

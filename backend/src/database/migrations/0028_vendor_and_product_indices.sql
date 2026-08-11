CREATE INDEX IF NOT EXISTS idx_products_tenant_approval_vendor ON products(tenant_id, approval_status, vendor_id);

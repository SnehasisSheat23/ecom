ALTER TABLE vendor_members
  DROP CONSTRAINT IF EXISTS uq_vendor_member_vendor_customer;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_member_tenant_vendor_customer
  ON vendor_members(tenant_id, vendor_id, customer_id);

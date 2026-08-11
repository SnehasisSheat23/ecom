-- Step 1: Drop old sub-order junction tables
DROP TABLE IF EXISTS order_sub_order_items CASCADE;
DROP TABLE IF EXISTS order_sub_orders CASCADE;

-- Step 2: Add vendor_id, checkout_group_id, payout_status, tracking_number, tracking_url directly to orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id),
  ADD COLUMN IF NOT EXISTS checkout_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS payout_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(500);

-- Step 3: Remove sub_order_id from vendor_ledger, shipments, support_tickets
ALTER TABLE vendor_ledger DROP COLUMN IF EXISTS sub_order_id;
ALTER TABLE shipments DROP COLUMN IF EXISTS sub_order_id;
ALTER TABLE support_tickets DROP COLUMN IF EXISTS sub_order_id;

-- Step 4: Drop old indexes if they reference removed columns/tables
DROP INDEX IF EXISTS idx_shipments_tenant_sub_order;

-- Step 5: Add new indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_tenant_vendor ON orders (tenant_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_group ON orders (tenant_id, checkout_group_id);

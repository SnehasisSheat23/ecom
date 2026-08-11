-- Migration: Add indexes for orders optimization
CREATE INDEX IF NOT EXISTS "idx_orders_tenant_status_created" ON "orders" ("tenant_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_order_items_tenant_vendor" ON "order_items" ("tenant_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "idx_orders_tenant_customer_email" ON "orders" ("tenant_id", "guest_email");

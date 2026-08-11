ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(150);
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_idempotency_tenant ON orders (tenant_id, idempotency_key);

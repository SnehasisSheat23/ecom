-- Drop old partial indexes
DROP INDEX IF EXISTS idx_carts_customer;
DROP INDEX IF EXISTS idx_carts_guest;

-- Create new multi-column indexes matching the updated Drizzle schema
CREATE INDEX idx_carts_customer ON carts (tenant_id, customer_id, status);
CREATE INDEX idx_carts_guest ON carts (tenant_id, guest_session_id, status);

-- Migration: Add composite index for customer list optimization
CREATE INDEX IF NOT EXISTS "idx_customers_active_list" ON "customers" ("tenant_id", "is_admin", "created_at" DESC);

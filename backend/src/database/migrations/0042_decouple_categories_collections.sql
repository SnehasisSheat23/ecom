-- Add display_type, level, created_by, updated_by to categories table if not present
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_type VARCHAR(20) NOT NULL DEFAULT 'TREE';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add display_type, sort_order, status, created_by, updated_by to collections table if not present
ALTER TABLE collections ADD COLUMN IF NOT EXISTS display_type VARCHAR(20) NOT NULL DEFAULT 'GRID';
ALTER TABLE collections ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE collections ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Ensure indexes for decoupled query execution
CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON categories(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_status ON categories(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_collections_tenant_status ON collections(tenant_id, is_active);

-- Phase 1: Catalog Optimization & High-Scale Indexing

-- 1. Drop premature sales channel tables
DROP TABLE IF EXISTS product_publishing CASCADE;
DROP TABLE IF EXISTS sales_channels CASCADE;

-- 2. Drop redundant duplicate index
DROP INDEX IF EXISTS idx_products_slug;

-- 3. Add high-performance storefront listing index
CREATE INDEX IF NOT EXISTS idx_products_storefront_listing 
ON products (tenant_id, status, approval_status, created_at DESC)
WHERE deleted_at IS NULL;

-- 4. Add GIN index for tag filtering
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);

-- 5. Add options JSONB column
ALTER TABLE products ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 6. Enforce vendor_id NOT NULL on products table
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vendors LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE products SET vendor_id = v_id WHERE vendor_id IS NULL;
  END IF;
END $$;

ALTER TABLE products ALTER COLUMN vendor_id SET NOT NULL;

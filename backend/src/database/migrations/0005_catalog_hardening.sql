ALTER TABLE products
  ALTER COLUMN vendor_commission_override TYPE NUMERIC(5,2)
  USING NULLIF(vendor_commission_override::text, '')::numeric;

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
ALTER TABLE categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES categories(id);

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS storage_path VARCHAR(500);

ALTER TABLE product_images
  DROP CONSTRAINT IF EXISTS product_images_variant_id_fkey;
ALTER TABLE product_images
  ADD CONSTRAINT product_images_variant_id_fkey
  FOREIGN KEY (variant_id) REFERENCES variants(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_slug_tenant ON products(tenant_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_sku_tenant ON variants(tenant_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_slug_tenant ON categories(tenant_id, slug);

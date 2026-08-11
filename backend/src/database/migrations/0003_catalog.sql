DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('physical', 'digital');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  status product_status NOT NULL DEFAULT 'draft',
  product_type product_type NOT NULL DEFAULT 'physical',
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  canonical_url VARCHAR(500),
  tax_class VARCHAR(50),
  vendor_commission_override NUMERIC(5,2),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  sku VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  compare_at_price INTEGER,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  track_inventory BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  weight_grams INTEGER,
  length_mm INTEGER,
  width_mm INTEGER,
  height_mm INTEGER,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_variant_sku_tenant UNIQUE (tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  parent_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_category_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES variants(id),
  url VARCHAR(500) NOT NULL,
  storage_path VARCHAR(500),
  alt_text VARCHAR(255),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_categories (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  variant_id UUID NOT NULL REFERENCES variants(id),
  old_price INTEGER NOT NULL,
  new_price INTEGER NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_status ON products(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_tenant_vendor ON products(tenant_id, vendor_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_slug_tenant ON products(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_variant_sku_tenant ON variants(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(tenant_id, sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_slug_tenant ON categories(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON product_categories(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_price_history_variant ON price_history(variant_id, changed_at DESC);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY products_tenant_isolation ON products
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY variants_tenant_isolation ON variants
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY categories_tenant_isolation ON categories
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY product_images_tenant_isolation ON product_images
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY product_categories_tenant_isolation ON product_categories
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY price_history_tenant_isolation ON price_history
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

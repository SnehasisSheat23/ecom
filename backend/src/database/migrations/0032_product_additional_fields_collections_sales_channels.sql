-- Alter products table to add tags
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tags') THEN
    ALTER TABLE "products" ADD COLUMN "tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Alter variants table to add new columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variants' AND column_name='cost_per_item') THEN
    ALTER TABLE "variants" ADD COLUMN "cost_per_item" integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variants' AND column_name='barcode') THEN
    ALTER TABLE "variants" ADD COLUMN "barcode" varchar(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variants' AND column_name='country_of_origin') THEN
    ALTER TABLE "variants" ADD COLUMN "country_of_origin" varchar(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variants' AND column_name='hs_code') THEN
    ALTER TABLE "variants" ADD COLUMN "hs_code" varchar(50);
  END IF;
END $$;

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_slug_tenant ON collections(tenant_id, slug);

-- Create product_collections table
CREATE TABLE IF NOT EXISTS product_collections (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_product_collections_tenant ON product_collections(tenant_id, collection_id);

-- Create sales_channels table
CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_channel_slug_tenant ON sales_channels(tenant_id, slug);

-- Create product_publishing table
CREATE TABLE IF NOT EXISTS product_publishing (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_product_publishing_tenant ON product_publishing(tenant_id, channel_id);

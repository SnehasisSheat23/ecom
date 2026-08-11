-- Table: bundle_definitions
CREATE TABLE IF NOT EXISTS bundle_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  type VARCHAR(20) NOT NULL DEFAULT 'CONFIGURABLE',
  pricing_model VARCHAR(20) NOT NULL DEFAULT 'FIXED_PRICE',
  fixed_price INTEGER,
  base_price INTEGER NOT NULL DEFAULT 0,
  min_items INTEGER NOT NULL DEFAULT 1,
  max_items INTEGER NOT NULL DEFAULT 10,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bundle_type_check CHECK (type IN ('FIXED', 'CONFIGURABLE')),
  CONSTRAINT bundle_pricing_check CHECK (pricing_model IN ('FIXED_PRICE', 'DYNAMIC_PRICE', 'BASE_PLUS_ITEMS')),
  CONSTRAINT bundle_status_check CHECK (status IN ('active', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bundle_definitions_product ON bundle_definitions(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_definitions_tenant ON bundle_definitions(tenant_id, status);

-- Table: bundle_allowed_items
CREATE TABLE IF NOT EXISTS bundle_allowed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bundle_id UUID NOT NULL REFERENCES bundle_definitions(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id),
  category_id UUID,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity_per_bundle INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT bundle_item_source_check CHECK (
    (variant_id IS NOT NULL AND category_id IS NULL) OR
    (variant_id IS NULL AND category_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bundle_allowed_items_bundle ON bundle_allowed_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_allowed_items_variant ON bundle_allowed_items(variant_id) WHERE variant_id IS NOT NULL;

-- Table: bundle_selections
CREATE TABLE IF NOT EXISTS bundle_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bundle_selection_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_bundle_selections_order_item ON bundle_selections(order_item_id);

-- RLS Policies
ALTER TABLE bundle_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_definitions FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY bundle_definitions_tenant_isolation ON bundle_definitions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE bundle_allowed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_allowed_items FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY bundle_allowed_items_tenant_isolation ON bundle_allowed_items
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE bundle_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_selections FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY bundle_selections_tenant_isolation ON bundle_selections
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

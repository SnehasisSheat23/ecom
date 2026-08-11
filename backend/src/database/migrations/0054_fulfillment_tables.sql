-- Migration: Create fulfillment module tables and enums

DO $$ BEGIN
  CREATE TYPE fulfillment_node_type AS ENUM ('warehouse', 'dark_store', 'retail_store', 'restaurant', '3pl', 'pickup_center');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fulfillment_node_status AS ENUM ('active', 'busy_throttled', 'offline', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('created', 'accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'rejected', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_area_type AS ENUM ('pincode', 'radius', 'polygon', 'zone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS fulfillment_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  partner_id UUID REFERENCES partners(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  type fulfillment_node_type NOT NULL DEFAULT 'warehouse',
  status fulfillment_node_status NOT NULL DEFAULT 'active',
  address JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  max_orders_per_hour INTEGER NOT NULL DEFAULT 100,
  max_orders_per_day INTEGER NOT NULL DEFAULT 1000,
  prep_lead_time_minutes INTEGER NOT NULL DEFAULT 30,
  cutoff_time VARCHAR(10),
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fulfillment_node_tenant_slug ON fulfillment_nodes(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_fulfillment_nodes_tenant_status ON fulfillment_nodes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_nodes_partner ON fulfillment_nodes(partner_id);

CREATE TABLE IF NOT EXISTS fulfillment_service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  node_id UUID NOT NULL REFERENCES fulfillment_nodes(id) ON DELETE CASCADE,
  type service_area_type NOT NULL DEFAULT 'pincode',
  code VARCHAR(50),
  radius_km DOUBLE PRECISION,
  coordinates_json JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_service_areas_tenant_node ON fulfillment_service_areas(tenant_id, node_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_service_areas_code ON fulfillment_service_areas(code);

CREATE TABLE IF NOT EXISTS fulfillment_product_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL,
  partner_id UUID REFERENCES partners(id),
  fulfillment_fee_cents INTEGER NOT NULL DEFAULT 0,
  handling_fee_cents INTEGER NOT NULL DEFAULT 0,
  prep_lead_time_minutes INTEGER,
  handling_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fulfillment_prod_config ON fulfillment_product_configs(tenant_id, product_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_prod_config_product ON fulfillment_product_configs(product_id);

CREATE TABLE IF NOT EXISTS fulfillment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL,
  partner_id UUID REFERENCES partners(id),
  node_id UUID NOT NULL REFERENCES fulfillment_nodes(id),
  status assignment_status NOT NULL DEFAULT 'created',
  items JSONB NOT NULL,
  sla_target_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_assignments_tenant_order ON fulfillment_assignments(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_assignments_tenant_status ON fulfillment_assignments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_assignments_node ON fulfillment_assignments(node_id);

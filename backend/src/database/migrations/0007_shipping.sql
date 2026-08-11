CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL DEFAULT 'Domestic',
  countries JSONB NOT NULL DEFAULT '["IN"]'::jsonb,
  rate INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID,
  zone_id UUID REFERENCES shipping_zones(id),
  name VARCHAR(100) NOT NULL,
  strategy VARCHAR(30) NOT NULL DEFAULT 'flat',
  flat_rate INTEGER,
  rate_per_kg INTEGER,
  min_weight_g INTEGER,
  max_weight_g INTEGER,
  estimated_days INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_zones_tenant ON shipping_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_default ON shipping_zones(tenant_id, is_default);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_tenant ON shipping_methods(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_vendor ON shipping_methods(tenant_id, vendor_id);

ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY shipping_zones_tenant_isolation ON shipping_zones
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY shipping_methods_tenant_isolation ON shipping_methods
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE tenant_mode AS ENUM ('SINGLE_VENDOR', 'MULTI_VENDOR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE tenant_status AS ENUM ('onboarding', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  mode tenant_mode NOT NULL DEFAULT 'SINGLE_VENDOR',
  status tenant_status NOT NULL DEFAULT 'onboarding',
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  features JSONB NOT NULL DEFAULT '{"wishlist":false,"loyalty":false,"reviews":false,"cart_abandonment":false}',
  branding JSONB NOT NULL DEFAULT '{"primary_color":"#000000","secondary_color":"#ffffff","logo_url":null,"favicon_url":null,"font":"Inter"}',
  notification_config JSONB NOT NULL DEFAULT '{"from_name":"Store","from_email":"noreply@nexuscommerce.app"}',
  tax_config JSONB,
  payout_config JSONB,
  billing_plan_id UUID,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  shipping_flat_rate INTEGER NOT NULL DEFAULT 4900,
  free_shipping_threshold INTEGER,
  earn_rate DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  redeem_rate DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  cart_abandonment_delay_hours INTEGER NOT NULL DEFAULT 2,
  coupon_loyalty_stacking BOOLEAN NOT NULL DEFAULT false,
  return_window_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  provider VARCHAR(50) NOT NULL DEFAULT 'razorpay',
  credentials TEXT NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  is_test_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY tenant_identity_policy ON tenants
    USING (id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_config FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY tenant_config_isolation ON tenant_config
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tenant_payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payment_config FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY tenant_payment_config_isolation ON tenant_payment_config
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

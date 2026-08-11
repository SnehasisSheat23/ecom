CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  guest_session_id UUID REFERENCES guest_sessions(id),
  coupon_code VARCHAR(100),
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  selected_shipping_option_id VARCHAR(100),
  subtotal INTEGER NOT NULL DEFAULT 0,
  shipping_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carts_owner_check CHECK (
    ((customer_id IS NOT NULL)::int + (guest_session_id IS NOT NULL)::int) = 1
  ),
  CONSTRAINT carts_status_check CHECK (status IN ('active', 'expired', 'converted'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES variants(id),
  vendor_id UUID,
  product_type product_type NOT NULL,
  product_title_snapshot VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  line_total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT cart_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT cart_items_line_total_non_negative CHECK (line_total >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_variant ON cart_items(cart_id, variant_id);

CREATE TABLE IF NOT EXISTS saved_for_later_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  variant_id UUID NOT NULL REFERENCES variants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(tenant_id, customer_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_carts_guest ON carts(tenant_id, guest_session_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_saved_for_later_customer ON saved_for_later_items(tenant_id, customer_id);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY carts_tenant_isolation ON carts
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY cart_items_tenant_isolation ON cart_items
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE saved_for_later_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_for_later_items FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY saved_for_later_items_tenant_isolation ON saved_for_later_items
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

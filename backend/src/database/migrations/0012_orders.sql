CREATE TABLE IF NOT EXISTS order_sequences (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  next_value INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  order_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  guest_email VARCHAR(255),
  order_token UUID NOT NULL DEFAULT gen_random_uuid(),
  shipping_address_snapshot JSONB NOT NULL,
  billing_address_snapshot JSONB,
  shipping_method_snapshot JSONB,
  subtotal INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  shipping_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  coupon_code_snapshot VARCHAR(100),
  loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0,
  notes VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_number_tenant UNIQUE (tenant_id, order_number),
  CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID NOT NULL REFERENCES variants(id),
  vendor_id UUID,
  product_title_snapshot VARCHAR(255) NOT NULL,
  variant_title_snapshot VARCHAR(255) NOT NULL,
  sku_snapshot VARCHAR(100) NOT NULL,
  unit_price_snapshot INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  line_total INTEGER NOT NULL,
  image_url_snapshot VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  return_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_return_status_check CHECK (return_status IN ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED'))
);

CREATE TABLE IF NOT EXISTS order_sub_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  subtotal INTEGER NOT NULL,
  payout_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  provider VARCHAR(30),
  provider_order_id VARCHAR(255),
  provider_payment_id VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_customer ON orders(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(order_token);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(tenant_id, order_id);

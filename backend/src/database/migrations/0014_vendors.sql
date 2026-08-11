DO $$
BEGIN
  CREATE TYPE vendor_status AS ENUM ('onboarding', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  status vendor_status NOT NULL DEFAULT 'onboarding',
  email VARCHAR(255),
  phone VARCHAR(20),
  description VARCHAR(1000),
  logo_url VARCHAR(500),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  bank_details JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vendor_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS vendor_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vendor_member_vendor_customer UNIQUE (vendor_id, customer_id),
  CONSTRAINT vendor_members_role_check CHECK (role IN ('owner', 'manager', 'staff'))
);

CREATE TABLE IF NOT EXISTS order_sub_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sub_order_id UUID NOT NULL REFERENCES order_sub_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_sub_order_item UNIQUE (sub_order_id, order_item_id),
  CONSTRAINT uq_order_sub_order_item_tenant_order_item UNIQUE (tenant_id, order_item_id)
);

CREATE TABLE IF NOT EXISTS vendor_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  order_id UUID REFERENCES orders(id),
  sub_order_id UUID REFERENCES order_sub_orders(id),
  idempotency_key VARCHAR(150) NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  description VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vendor_ledger_tenant_idempotency UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT vendor_ledger_type_check CHECK (type IN ('SALE', 'PAYOUT', 'REFUND'))
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_members_customer ON vendor_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vendor ON vendor_ledger(vendor_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_sub_orders_tenant_order_vendor
  ON order_sub_orders(tenant_id, order_id, vendor_id);

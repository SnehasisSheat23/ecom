-- Step 1: Create checkouts table
CREATE TABLE IF NOT EXISTS checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  guest_email VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'CREATED',
  shipping_address_snapshot JSONB,
  billing_address_snapshot JSONB,
  shipping_method_snapshot JSONB,
  coupon_code_snapshot VARCHAR(100),
  discount_amount INTEGER NOT NULL DEFAULT 0,
  shipping_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method VARCHAR(50),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Create checkout_groups table
CREATE TABLE IF NOT EXISTS checkout_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  checkout_id UUID NOT NULL REFERENCES checkouts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  guest_email VARCHAR(255),
  payment_intent_id UUID,
  order_count INTEGER NOT NULL DEFAULT 1,
  total_amount INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Add performed_by to inventory_history
ALTER TABLE inventory_history ADD COLUMN IF NOT EXISTS performed_by UUID;

-- Step 4: Add Indexes
CREATE INDEX IF NOT EXISTS idx_checkouts_tenant_customer ON checkouts (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_tenant_status ON checkouts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_checkout_groups_tenant_checkout ON checkout_groups (tenant_id, checkout_id);
CREATE INDEX IF NOT EXISTS idx_checkout_groups_tenant_customer ON checkout_groups (tenant_id, customer_id);

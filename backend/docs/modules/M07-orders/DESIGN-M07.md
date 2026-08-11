# DESIGN-M07 — Orders

## File Map
| File | Purpose |
|------|---------|
| `orders.schema.ts` | `orders`, `order_items`, `order_sub_orders` tables |
| `orders.repository.ts` | Order CRUD, human order number generation |
| `orders.service.ts` | `placeOrder()` atomic transaction, status machine, cancellation |
| `orders.routes.ts` | Customer + admin + guest endpoints |
| `orders.test.ts` | Transaction rollback tests, concurrency tests |

## DDL (key tables)
```sql
CREATE TABLE orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  customer_id               UUID REFERENCES customers(id),
  order_number              VARCHAR(20) NOT NULL,
  status                    VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  guest_email               VARCHAR(255),
  order_token               UUID DEFAULT gen_random_uuid(),
  shipping_address_snapshot JSONB NOT NULL,
  billing_address_snapshot  JSONB,
  subtotal                  INTEGER NOT NULL,
  discount_amount           INTEGER NOT NULL DEFAULT 0,
  shipping_amount           INTEGER NOT NULL DEFAULT 0,
  tax_amount                INTEGER NOT NULL DEFAULT 0,
  total                     INTEGER NOT NULL,
  coupon_id                 UUID,
  coupon_code_snapshot      VARCHAR(100),
  loyalty_points_redeemed   INTEGER DEFAULT 0,
  return_eligible_until     TIMESTAMPTZ,
  notes                     TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_number_tenant UNIQUE (tenant_id, order_number)
);

CREATE TABLE order_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  order_id                 UUID NOT NULL REFERENCES orders(id),
  product_id               UUID NOT NULL REFERENCES products(id),
  variant_id               UUID NOT NULL REFERENCES variants(id),
  vendor_id                UUID,
  product_title_snapshot   VARCHAR(255) NOT NULL,
  variant_title_snapshot   VARCHAR(255) NOT NULL,
  sku_snapshot             VARCHAR(100) NOT NULL,
  unit_price_snapshot      INTEGER NOT NULL,
  quantity                 INTEGER NOT NULL,
  line_total               INTEGER NOT NULL,
  image_url_snapshot       VARCHAR(500),
  metadata                 JSONB NOT NULL DEFAULT '{}',
  return_status            VARCHAR(20) DEFAULT 'NONE',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_sub_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  order_id    UUID NOT NULL REFERENCES orders(id),
  vendor_id   UUID NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  subtotal    INTEGER NOT NULL,
  payout_status VARCHAR(20) DEFAULT 'PENDING',
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_sub_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  sub_order_id  UUID NOT NULL REFERENCES order_sub_orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  vendor_id     UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sub_order_id, order_item_id),
  UNIQUE (tenant_id, order_item_id)
);

CREATE INDEX idx_orders_tenant_customer ON orders(tenant_id, customer_id);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_orders_token ON orders(order_token);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

## Sequence: placeOrder()
```
Client POST /orders { addressId, guestEmail? }
    │
    ▼
Validate cart items (stock, prices)
    │
    ▼
BEGIN TRANSACTION
    ├── SELECT FOR UPDATE on inventory rows for tracked variants
    ├── INSERT orders (status: PENDING)
    ├── INSERT order_items (with snapshots)
    ├── Emit OrderCreatedEvent (for vendor layer)
    ├── UPDATE inventory (reserved → sold) for tracked variants
    ├── INSERT coupon_usage (if coupon applied)
    ├── INSERT loyalty_ledger (negative delta if points redeemed)
    ├── INSERT payment_intent (status: PENDING)
    ├── UPDATE cart (status: converted)
COMMIT
    │
    ▼
Return { orderId, orderNumber, paymentIntentId }
```

## Known Gotchas
1. **Order number sequence.** Create a Postgres sequence per tenant: `CREATE SEQUENCE order_seq_{tenantId}`. Format: `ORD-{padded_number}`.
2. **Transaction scope.** The entire 10-step placement MUST be one transaction. Do NOT break it into multiple transactions.
3. **OrderCreatedEvent timing.** Emit inside the transaction if using a synchronous event bus. If using BullMQ, enqueue the job after commit (but handle the case where commit succeeds but enqueue fails).
4. **Mixed carts.** Orders may contain both tracked and untracked variants. Only tracked variants participate in inventory locks and mutations.
5. **Shipping option selection.** `placeOrder()` receives `selected_shipping_option_id` from checkout (defaults to first option in V1). The chosen `ShippingOption` is stored as `shipping_method_snapshot JSONB` on the order so the label, description, and estimated days are preserved even if shipping configuration changes later.
6. **Shipping amount source.** `orders.shipping_amount` comes from the selected `ShippingOption.amount` — never recalculated from tenant config after order placement.
7. **Vendor splitting contract.** In multi-vendor mode, M14 must create `order_sub_order_items` so every vendor-owned `order_item` maps to exactly one sub-order.

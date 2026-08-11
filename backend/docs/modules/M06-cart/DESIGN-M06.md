# DESIGN-M06 — Cart

## File Map
| File | Purpose |
|------|---------|
| `cart.schema.ts` | `carts`, `cart_items`, `saved_for_later_items` tables |
| `cart.repository.ts` | Cart CRUD, item management, cache ops |
| `cart.service.ts` | Business logic: add/remove/merge, pricing, checkout validation |
| `cart.routes.ts` | Cart endpoints |
| `cart.test.ts` | Merge tests, pricing tests, expiry tests |

## DDL
```sql
CREATE TABLE carts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID REFERENCES customers(id),
  guest_session_id UUID REFERENCES guest_sessions(id),
  coupon_code     VARCHAR(100),
  loyalty_points  INTEGER DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, converted
  selected_shipping_option_id VARCHAR(100),
  subtotal        INTEGER NOT NULL DEFAULT 0,
  shipping_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id  UUID NOT NULL REFERENCES variants(id),
  vendor_id   UUID,
  product_type product_type NOT NULL,
  product_title_snapshot VARCHAR(255) NOT NULL,
  quantity    INTEGER NOT NULL,
  unit_price  INTEGER NOT NULL, -- snapshot at add time
  metadata    JSONB NOT NULL DEFAULT '{}',
  line_total  INTEGER NOT NULL, -- quantity * unit_price
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE saved_for_later_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  variant_id  UUID NOT NULL REFERENCES variants(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_customer ON carts(tenant_id, customer_id) WHERE status = 'active';
CREATE INDEX idx_carts_guest ON carts(guest_session_id) WHERE status = 'active';
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
```

## QStash Webhooks
| Endpoint | Purpose | Payload | Delay |
|----------|---------|---------|-------|
| `POST /api/v1/webhooks/cart-expiry` | Expire cart + release inventory | `{ "cartId": "UUID", "tenantId": "UUID" }` | 7 days |

**Implementation Note:** Every cart mutation (add/remove/update) must call `qstash.publish()` with a `deduplicationId` based on the `cartId`. This effectively "resets" the 7-day timer by overwriting the pending QStash message.

## Known Gotchas
1. **Cart merge atomicity.** Merge must be in a transaction — if it fails halfway, neither cart should be modified.
2. **Cache invalidation on merge.** Both the old guest cart key and the customer cart key must be invalidated.
3. **Coupon/loyalty stubs.** These return 0 now but the `discount_amount` field in the response must be present from day 1.
4. **Inventory is optional per variant.** Cart flows must look up Catalog variant metadata and skip reserve/release logic for `track_inventory = false`.
5. **Shipping options are an array.** M05 `calculate()` returns `ShippingOption[]`. Cart response must include all available options. In V1 there's always exactly one. The frontend auto-selects it. When a customer picks a shipping method, store `selected_shipping_option_id` on the cart for checkout.
6. **Digital-only carts.** If all items are `product_type = 'digital'`, M05 returns `amount: 0`. Cart total should reflect this.
7. **Snapshots matter.** Keep `subtotal`, `shipping_amount`, `discount_amount`, `total`, `product_title_snapshot`, and `selected_shipping_option_id` on the cart/cart items so refreshes and checkout reads do not recompute the world on every request.

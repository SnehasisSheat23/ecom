# PRD-M04 — Inventory

**Layer:** Core | **Phase:** 1 | **Estimate:** 1 day
**Depends on:** M01, M03 (variant IDs)
**Required by:** M06 (reserve on cart add), M07 (decrement on order)
**Source:** `src/modules/inventory/`

---

## Context

Inventory tracks stock for variants that opt into inventory tracking. All mutations go through `inventory.repository.ts` — no other module touches inventory tables directly. Concurrency is handled with `SELECT FOR UPDATE` inside transactions to prevent overselling.

## V1 Scope

- `quantity_available, quantity_reserved, quantity_sold` per tracked variant
- `allow_backorder` BOOLEAN per variant
- `low_stock_threshold` INTEGER (informational, logs alert)
- Variants with `track_inventory = false` do not get inventory rows and bypass this module entirely
- **Reserve:** decrement `available`, increment `reserved`. Schedule 15-min delayed release job through the queue adapter.
- **Release:** restore `available`, decrement `reserved` (item removed, cart expired, TTL)
- **Permanent decrement:** called by M07 only during order placement — converts reserved → sold
- **Restore on cancellation:** called by M07 — converts sold back to available
- `inventory_history` append-only table: every mutation logged with reason
- All mutations use `SELECT FOR UPDATE` (Data Integrity Rule R5)

## Out of Scope
- Multi-warehouse / location-based inventory
- Batch / lot tracking
- Automated restock alerts to suppliers
- Per-cart reservation persistence (`inventory_reservations` or equivalent)

## Future Scope

The current M04 design is acceptable for early stores and low-to-moderate traffic because it tracks aggregate reserved stock at the variant level. A later hardening pass may introduce cart-level reservation persistence so delayed release jobs can verify and release the exact reservation owned by a specific cart.

Example future shape:

```sql
CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  variant_id UUID NOT NULL REFERENCES variants(id),
  cart_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, variant_id, cart_id)
);
```

This is not required for the initial rollout, but should be added before scaling into heavier cart concurrency or if strict cart-level reservation auditability becomes a business requirement.

## Schema

```sql
CREATE TABLE inventory (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  variant_id            UUID NOT NULL REFERENCES variants(id) UNIQUE,
  quantity_available     INTEGER NOT NULL DEFAULT 0,
  quantity_reserved      INTEGER NOT NULL DEFAULT 0,
  quantity_sold          INTEGER NOT NULL DEFAULT 0,
  allow_backorder        BOOLEAN NOT NULL DEFAULT false,
  low_stock_threshold    INTEGER NOT NULL DEFAULT 5,
  location_id            UUID, -- schema hook
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  variant_id  UUID NOT NULL REFERENCES variants(id),
  delta       INTEGER NOT NULL,
  reason      VARCHAR(50) NOT NULL, -- 'reserved', 'released', 'sold', 'restored', 'manual_adjust'
  order_id    UUID,
  cart_id     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_variant ON inventory(variant_id);
CREATE INDEX idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX idx_inventory_history_variant ON inventory_history(variant_id, created_at DESC);
```

## API Contracts

```
GET    /admin/inventory              — List inventory (filterable by low stock)
PATCH  /admin/inventory/:variantId   — Manual stock adjustment
GET    /admin/inventory/:variantId/history — Inventory history
```

Internal service methods (called by M06, M07 — not API endpoints):
```
reserve(variantId, quantity, cartId) → void
release(variantId, quantity, cartId) → void
permanentDecrement(variantId, quantity, orderId, cartId?) → void
restoreOnCancellation(variantId, quantity, orderId) → void
createInventoryForTrackedVariant(variantId, initialStock?) → void
```

Catalog contract precondition:
```text
Only variants where `track_inventory = true` may be passed to M04.
If `track_inventory = false`, consuming modules must skip M04 calls.
```

## Business Logic Rules

1. All mutations use `SELECT FOR UPDATE` — lock inventory row before changing
2. If `quantity_available < requested` and `allow_backorder = false` → throw InsufficientStockError
3. Inventory rows exist only for variants where Catalog `track_inventory = true`
4. Missing inventory row for a tracked variant is a data integrity error, not "in stock"
5. Every mutation creates an `inventory_history` entry with reason
6. Reserve schedules a delayed job to auto-release after 15 minutes
7. Manual stock adjustment by admin also logs to history with reason `manual_adjust`
8. Low stock threshold is informational only in v1 — no automated alerts
9. M07 should pass `cartId` into `permanentDecrement()` when converting a reservation into a sold item so the pending delayed release job can be cancelled
10. M03 should create an initial inventory row for tracked variants when a variant is created
11. Admin stock adjustment accepts both positive and negative deltas: positive adds stock, negative removes stock

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Two concurrent reserve for last unit | Only one succeeds (SELECT FOR UPDATE serializes) |
| Release more than reserved | Clamp to 0 reserved, log warning |
| Permanent decrement without prior reserve | Still works (direct sell path) |
| Backorder enabled, 0 stock | Reserve succeeds, available goes negative |
| Variant has `track_inventory = false` | M04 not called; variant is treated as untracked by caller |
| Tracked variant missing inventory row | 500/data integrity error until repaired |
| Delayed release job fires after order placed | Check if reservation still exists before releasing |
| Multiple carts reserve same variant | V1 tracks only aggregate reserved quantity; exact cart-level reservation ownership is future scope |

## Acceptance Criteria

- [ ] Add item to cart → inventory reserved
- [ ] Add untracked variant to cart → no reservation attempted, add succeeds
- [ ] Remove item from cart → inventory released
- [ ] Simulate two concurrent requests for last unit — only one succeeds
- [ ] `inventory_history` has an entry for every change
- [ ] Manual adjustment via admin works and is logged
- [ ] Delayed release fires after 15 min, inventory restored
- [ ] Delayed release flow is idempotent when the same job is delivered more than once
- [ ] Publish/cancel failures for delayed release jobs are logged with tenant and job identifiers
- [ ] Integration test covers reserve → delayed release handler → final stock state

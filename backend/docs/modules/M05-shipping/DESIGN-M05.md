# DESIGN-M05 — Shipping

<!-- TODO: Expand with full Drizzle schema definitions before implementation -->

## File Map

| File | Purpose | Imports |
|------|---------|---------|
| `shipping.schema.ts` | Drizzle tables: `shipping_zones`, `shipping_methods` | `drizzle-orm`, `tenancy.schema` |
| `shipping.types.ts` | `ShippingOption`, `ShippingStrategy`, `CartItemForShipping` interfaces | — |
| `shipping.validators.ts` | Zod schemas for estimate query params | `zod` |
| `shipping.service.ts` | `calculate()` — sole public interface for shipping costs | `shipping.types`, `tenancy.types` |
| `shipping.routes.ts` | `GET /shipping/estimate` | `shipping.service`, `shipping.validators` |
| `shipping.test.ts` | Unit tests on flat-rate calculation | `shipping.service` |

## Database Schema (DDL)

```sql
-- V1: one default zone per tenant
CREATE TABLE shipping_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        VARCHAR(100) NOT NULL DEFAULT 'Domestic',
  countries   JSONB NOT NULL DEFAULT '["IN"]',
  rate        INTEGER NOT NULL,   -- flat rate in smallest currency unit
  is_default  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schema hook: populated when tenant enables advanced shipping
CREATE TABLE shipping_methods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  vendor_id       UUID,                          -- NULL = tenant-wide, set = vendor-specific
  zone_id         UUID REFERENCES shipping_zones(id),
  name            VARCHAR(100) NOT NULL,          -- 'Standard', 'Express'
  strategy        VARCHAR(30) NOT NULL DEFAULT 'flat',  -- 'flat' | 'weight_based' | 'free'
  flat_rate       INTEGER,                        -- if strategy = flat
  rate_per_kg     INTEGER,                        -- if strategy = weight_based
  min_weight_g    INTEGER,                        -- weight bracket start
  max_weight_g    INTEGER,                        -- weight bracket end (NULL = unlimited)
  estimated_days  INTEGER NOT NULL DEFAULT 5,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Application-level tenant filtering
-- Every tenant-scoped repository query must include tenant_id in the predicate.

-- Indexes
CREATE INDEX idx_shipping_zones_tenant ON shipping_zones(tenant_id);
CREATE INDEX idx_shipping_methods_tenant ON shipping_methods(tenant_id, is_active);
CREATE INDEX idx_shipping_methods_vendor ON shipping_methods(tenant_id, vendor_id) WHERE vendor_id IS NOT NULL;
```

## Core Types

```typescript
type ShippingStrategy = 'flat_rate' | 'weight_based' | 'vendor_managed' | 'carrier_api'

interface ShippingOption {
  id: string             // stable identifier: 'standard', 'express', or UUID
  label: string          // 'Standard Shipping'
  description: string    // '3–5 business days'
  estimated_days: number
  amount: number         // in smallest currency unit (paise)
  vendor_id?: string     // only set for vendor_managed strategy
}

interface CartItemForShipping {
  variant_id: string
  quantity: number
  weight_grams: number | null
  product_type: 'physical' | 'digital'
  vendor_id: string | null
}
```

## Service Interface

```typescript
class ShippingService {
  // Returns array — V1 always returns exactly 1 element
  // M06 (Cart) and M07 (Orders) consume the array interface from day 1
  async calculate(
    items: CartItemForShipping[],
    address: Address | null,
    tenant: TenantContext,
    metadata?: Record<string, any> // cart/order metadata (e.g. delivery_slot)
  ): Promise<ShippingOption[]>
}
```

## V1 Implementation (Flat-Rate Only)

```typescript
// V1: ignores items, address, zones, methods tables
// Just reads tenant config and returns one option
async calculate(items, address, tenant): Promise<ShippingOption[]> {
  const hasOnlyDigital = items.every(i => i.product_type === 'digital')
  if (hasOnlyDigital) {
    return [{ id: 'digital', label: 'Digital Delivery', description: 'Instant', estimated_days: 0, amount: 0 }]
  }

  const subtotal = /* from pricing context or passed in */
  const threshold = tenant.config.free_shipping_threshold
  const isFree = threshold !== null && subtotal >= threshold

  return [{
    id: 'standard',
    label: 'Standard Shipping',
    description: '3–5 business days',
    estimated_days: 5,
    amount: isFree ? 0 : tenant.config.shipping_flat_rate,
  }]
}
```

## Extension Strategy (Post-V1)

When a tenant needs advanced shipping, `calculate()` dispatches based on strategy:

```typescript
async calculate(items, address, tenant): Promise<ShippingOption[]> {
  switch (tenant.config.shipping_strategy) {
    case 'flat_rate':       return this.flatRate(items, tenant)
    case 'weight_based':    return this.weightBased(items, tenant)
    case 'vendor_managed':  return this.vendorManaged(items, tenant)
    case 'carrier_api':     return this.carrierApi(items, address, tenant)
  }
}
```

**No changes needed in M06 or M07** — they already consume `ShippingOption[]`.

## Vendor Ownership Guard

When `shipping_methods.vendor_id` is set in future shipping-management endpoints, service-layer write operations must enforce ownership:

- Super Admin can create/update/delete any tenant-wide or vendor-specific shipping method.
- Tenant Admin can manage any shipping method inside their tenant.
- Vendor-linked users can only manage rows where `shipping_methods.vendor_id = actor.activeVendorId`.
- Vendor-linked users must not create or reassign methods for a different `vendor_id`.

## Known Gotchas

1. **Return an array from day 1.** If V1 returns a single object, M06/M07 will hardcode to expect one — and you'll have a breaking change when you add express shipping.
2. **Pricing pipeline integration.** `calculate()` is called by `src/lib/pricing.ts`. The `ShippingOption.amount` must be in the same currency unit as cart prices (paise/cents).
3. **Digital-only orders.** Skip shipping entirely for `product_type = 'digital'` items. Return amount = 0.
4. **Subtotal for free shipping check.** `calculate()` needs the order subtotal to check the threshold. Either pass it in explicitly or compute from items.
5. **Each option needs a stable `id`.** Cart sends `selected_shipping_option_id` at checkout. V1 always selects `'standard'` automatically.
6. **3-Tier Authorization.** Management of `shipping_methods` must verify:
    - Super Admin/Tenant Admin: Create/Edit any method.
    - Vendor Staff: Only manage methods where `vendor_id` matches their active vendor context.

## What Changes in Other Modules (Right Now, for V1)

| Module | Change Needed | Why |
|--------|--------------|-----|
| **M01 Tenancy** | Add `shipping_strategy` column (default `'flat_rate'`) to `tenant_config` | So each tenant can independently enable advanced shipping later |
| **CONTRACTS.md** | Update `ShippingResult` → `ShippingOption` (array return type) | All consumers should expect an array |
| **M06 Cart** (future) | Accept `ShippingOption[]`, auto-select first in V1 | Cart displays options and passes selected ID to checkout |
| **M07 Orders** (future) | Accept `selected_shipping_option_id` in checkout payload | Order records which shipping method was chosen |

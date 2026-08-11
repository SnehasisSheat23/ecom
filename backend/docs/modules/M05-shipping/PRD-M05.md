# PRD-M05 — Shipping

**Layer:** Core | **Phase:** 1 | **Estimate:** 1 day
**Depends on:** M01 (tenant config for rates)
**Required by:** M06, M07 (pricing pipeline)
**Source:** `src/modules/shipping/`

---

## Context
Shipping calculates delivery cost for an order. V1 is flat-rate only — one rate per tenant, with optional free shipping above a threshold. The `calculate()` function is the sole public interface, wired into the pricing pipeline.

The architecture is designed so that advanced shipping strategies (weight-based, multiple methods, vendor-managed) can be added later **without breaking M06 or M07**.

## V1 Scope

### Flat-Rate Shipping
- One shipping rate per tenant from `tenant_config.shipping_flat_rate`
- Free shipping when order subtotal ≥ `tenant_config.free_shipping_threshold`
- `shipping_zones` table present (schema hook — one default zone only)
- Wire into `src/lib/pricing.ts` pipeline

### Return Type (Future-Proof from Day 1)
`calculate()` returns `ShippingOption[]` — an **array** even in V1 (with one element). This means M06/M07 never need to change their interface when we add express shipping, vendor-managed rates, etc.

```typescript
// V1: returns one option
[{ id: 'standard', label: 'Standard Shipping', description: '3–5 business days', estimated_days: 5, amount: 4900 }]

// Future: returns multiple options for customer to choose
[
  { id: 'standard', label: 'Standard', description: '3–5 days', estimated_days: 5, amount: 4900 },
  { id: 'express', label: 'Express', description: '1–2 days', estimated_days: 2, amount: 14900 },
]
```

### Schema Hooks (write schema from day 1, logic deferred)
- `shipping_zones` table — one default zone per tenant
- `shipping_methods` table — placeholder for future Standard/Express/Same-Day
- `tenant_config.shipping_strategy` column — defaults to `'flat_rate'`

## Out of Scope (V1)
- Carrier-based rates (Shiprocket, Delhivery)
- Multiple shipping methods (express, standard)
- Weight-based or distance-based pricing
- Vendor-managed shipping in multi-vendor tenants
- International shipping

## Extension Path (Post-V1, No Breaking Changes)

These features can be added by changing **only M05** — M06 and M07 are unaffected because they already consume `ShippingOption[]`.

| Strategy | Tenant Config | How `calculate()` changes |
|----------|---------------|---------------------------|
| **`flat_rate`** (V1) | `shipping_flat_rate` in tenant config | Returns 1 option with flat rate or 0 |
| **`weight_based`** | Rate brackets in `shipping_methods` | Sums variant weights from cart items, applies rate brackets |
| **`vendor_managed`** | Per-vendor rows in `shipping_methods` | Groups cart items by vendor, calculates per-vendor shipping |
| **`carrier_api`** | Carrier credentials in tenant config | Calls Shiprocket/Delhivery API behind `ShippingProvider` interface |

### What M06/M07 Do With the Array
- **M06 (Cart):** Returns all options to frontend. Frontend lets customer pick one.
- **M07 (Orders):** Receives `selected_shipping_option_id` from checkout. Stores the chosen option's amount in order total. In V1, Cart auto-selects the only option.

## API Contracts

### Public Endpoint
```
GET /shipping/estimate?address_id={id}  — Returns available shipping options
```
Response: `{ data: ShippingOption[] }`

### Internal Interface
```typescript
shippingModule.calculate(items: CartItem[], address: Address | null, tenant: TenantContext): Promise<ShippingOption[]>
```

## Business Logic Rules
1. If `free_shipping_threshold` is set and subtotal ≥ threshold → amount = 0
2. Otherwise amount = `shipping_flat_rate` from tenant config
3. If no address provided, return the flat rate (estimation mode)
4. Always return an array — even if it contains only one option
5. Each option has a stable `id` that the cart/checkout can reference

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| No address provided | Return flat rate (estimation mode) |
| Subtotal exactly equals threshold | Free shipping applies (≥, not >) |
| `free_shipping_threshold` is null | Free shipping never applies |
| `shipping_flat_rate` is 0 | Shipping is always free |
| Digital-only order | Amount = 0, label = 'Digital Delivery' |

## Cross-Module Interactions

| Direction | Module | What |
|-----------|--------|------|
| **Called by** | M06 | Cart total calculation + display available options |
| **Called by** | M07 | Order total at checkout (uses selected option) |
| **Reads** | M01 | `tenant_config.shipping_flat_rate`, `free_shipping_threshold` |
| **Reads** | M03 | Variant weights (future — for weight-based) |

## Acceptance Criteria

- [ ] `calculate()` returns correct flat rate as a single-element array
- [ ] Returns `amount: 0` when order exceeds free shipping threshold
- [ ] Digital-only orders return `amount: 0`
- [ ] Pricing pipeline total includes shipping correctly
- [ ] Return type is `ShippingOption[]` (array), not a single object
- [ ] `shipping_zones` and `shipping_methods` tables created (schema hooks only)

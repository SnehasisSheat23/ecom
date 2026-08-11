# DESIGN-M04 — Inventory

## File Map
| File | Purpose |
|------|---------|
| `inventory.schema.ts` | `inventory`, `inventory_history` tables |
| `inventory.repository.ts` | All mutations with `SELECT FOR UPDATE` |
| `inventory.service.ts` | Reserve, release, decrement, restore logic + adapter-backed delayed scheduling |
| `inventory.routes.ts` | Admin inventory management endpoints |
| `inventory.validators.ts` | Zod schemas for stock adjustment |
| `inventory.test.ts` | Concurrency tests |

## Service Interface

```typescript
class InventoryService {
  async reserve(variantId: string, quantity: number, cartId: string, tenantId: string): Promise<void>
  async release(variantId: string, quantity: number, cartId: string, tenantId: string): Promise<void>
  async permanentDecrement(
    variantId: string,
    quantity: number,
    orderId: string,
    tenantId: string,
    cartId?: string
  ): Promise<void>
  async restoreOnCancellation(variantId: string, quantity: number, orderId: string, tenantId: string): Promise<void>
  async adjustStock(variantId: string, delta: number, reason: string, tenantId: string): Promise<void>
  async createInventoryForTrackedVariant(tenantId: string, input: CreateInventoryInput): Promise<InventoryRecord>
  async getStock(variantId: string, tenantId: string): Promise<InventoryRecord>
  async listInventory(tenantId: string): Promise<PaginatedInventoryResult>
  async listHistory(variantId: string, tenantId: string, filters?: InventoryHistoryFilters): Promise<PaginatedInventoryHistoryResult>
}
```

Callers must first resolve Catalog variant metadata and invoke this service only when `track_inventory = true`.

## Delayed Jobs

| Queue | Job | Payload | Delay |
|-------|-----|---------|-------|
| `tenant:{tenantId}:inventory-release` | Release reservation | `{ variantId, quantity, cartId }` | 15 minutes |

The current implementation is intentionally adapter-friendly: queue name, job name, delay, and deterministic job ID are all constructed in a small module boundary so QStash is the default today and BullMQ can be added later without changing core inventory logic.

## Future Hardening

If stricter cart-level reservation tracking is needed later, add an `inventory_reservations` table and make delayed release jobs validate the reservation row by `cart_id` before restoring stock. This is a forward-compatible enhancement, not a prerequisite for the current v1 rollout.

## Known Gotchas

1. **SELECT FOR UPDATE scope.** Must be inside a `db.transaction()` call. If used outside a transaction, the lock is released immediately and provides no protection.
2. **Delayed job race with order.** The release job might fire right as an order is being placed. Check if the cart item still has a reservation before releasing.
3. **inventory_history is append-only.** Never UPDATE or DELETE rows. Auditors compute stock from these entries.
4. **No fake inventory rows for simple stores.** Do not use `allow_backorder` as a substitute for disabling tracking. Untracked variants should have `track_inventory = false` in Catalog and no row in `inventory`.
5. **Aggregate reservations in v1.** Current M04 tracks reserved totals per variant, not per-cart reservation rows. This is acceptable for early rollout but should be revisited before larger-scale cart concurrency.
6. **3-Tier Authorization.** Service methods must enforce:
    - Super Admin: Full bypass.
    - Tenant Admin: Full access within tenant.
    - Vendor Staff: Restricted to products matching their `vendor_id`.

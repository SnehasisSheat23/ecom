# Phase 7: Inventory & Stock Management Alignment

## Goal
Align the inventory module with catalog and identity changes by enforcing mandatory `vendorId` scoping, handling `trackInventory = false` (untracked/digital items) during checkout, and updating role-based inventory guards.

---

## Key Changes

### 1. Mandatory `vendorId` Scoping (`src/modules/inventory/inventory.schema.ts`)
Since every product belongs to a vendor (and in single-vendor mode, products belong to the default store vendor), `inventory.vendorId` should be **NOT NULL**.

```typescript
export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    vendorId: uuid('vendor_id').notNull().references(() => vendors.id), // Mandatory vendor scoping
    variantId: uuid('variant_id').notNull().references(() => variants.id).unique(),
    quantityAvailable: integer('quantity_available').notNull().default(0),
    quantityReserved: integer('quantity_reserved').notNull().default(0),
    quantitySold: integer('quantity_sold').notNull().default(0),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    locationId: uuid('location_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_inventory_variant').on(table.variantId),
    index('idx_inventory_tenant').on(table.tenantId),
    index('idx_inventory_tenant_vendor').on(table.tenantId, table.vendorId),
  ],
)
```

---

### 2. Untracked Variants (`trackInventory = false`) Fix

#### The Bug:
When a variant has `trackInventory = false` (e.g. digital downloads, services), checkout previously attempted to lock and update an inventory row that didn't exist, throwing:
`AppError: Tracked variant inventory row missing (500)`

#### The Fix:
Update cart reservation and order placement logic (`orders.service.ts` / `cart.service.ts`) to check `variant.trackInventory`:

```typescript
for (const item of cartItems) {
  const variant = await this.catalogRepository.findVariantById(item.variantId)
  
  if (variant.trackInventory) {
    // Physical product: Reserve stock & verify availability
    await this.inventoryService.reserve(variant.id, item.quantity, cartId, tenantId)
  }
  // Untracked/Digital product: Skip inventory operations, always available
}
```

---

### 3. Updated Access Guards (`inventory.service.ts`)
Replace legacy `actor.isSuperAdmin` / `actor.isAdmin` checks in `assertCanManageInventory()` with the new `user_roles` & `vendor_members` checks introduced in Phase 3:

```typescript
private assertCanManageInventory(
  record: Pick<InventoryRecord, 'tenantId' | 'vendorId'>,
  user?: AuthenticatedUser,
): void {
  if (!user) return
  if (user.role === 'PLATFORM_ADMIN') return
  if (user.role === 'TENANT_ADMIN' && user.tenantId === record.tenantId) return
  if (user.vendorId && user.vendorId === record.vendorId) return

  throw new AppError('Forbidden', 403, 'forbidden')
}
```

---

## Verification Plan

1. **Untracked Variant Test**: Create a product with `trackInventory = false` and verify checkout completes without requiring an inventory row.
2. **Vendor Scoping Test**: Verify vendor staff can only view and adjust inventory for variants matching their `vendorId`.

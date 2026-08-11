# Phase 2: Order System Simplification (Vendor-Scoped Orders)

## Goal
Simplify the order system from a 4-table sub-order design (`orders`, `order_items`, `order_sub_orders`, `order_sub_order_items`) down to a **2-table Vendor-Scoped Order model** (`orders`, `order_items`).

---

## Architecture Comparison

### Before (4 Tables)
- `orders` (Master order)
- `order_sub_orders` (Sub-order per vendor)
- `order_sub_order_items` (Junction table)
- `order_items` (Line items snapshot)

### After (2 Tables)
- **`orders`**: Directly vendor-scoped via `vendorId`. Grouped for customer view via `checkoutGroupId`.
- **`order_items`**: Directly attached to `orderId`.

---

## Schema Definition (`src/modules/orders/orders.schema.ts`)

```typescript
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    vendorId: uuid('vendor_id').notNull().references(() => vendors.id),
    customerId: uuid('customer_id').references(() => customers.id),
    checkoutGroupId: uuid('checkout_group_id').notNull(), // Groups multi-vendor purchases
    orderNumber: varchar('order_number', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).$type<
      'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
    >().notNull().default('PENDING'),
    payoutStatus: varchar('payout_status', { length: 20 }).notNull().default('PENDING'),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    trackingUrl: varchar('tracking_url', { length: 500 }),
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, unknown>>().notNull(),
    billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, unknown>>(),
    subtotal: integer('subtotal').notNull(),
    discountAmount: integer('discount_amount').notNull().default(0),
    shippingAmount: integer('shipping_amount').notNull().default(0),
    taxAmount: integer('tax_amount').notNull().default(0),
    total: integer('total').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_order_number_tenant').on(table.tenantId, table.orderNumber),
    index('idx_orders_tenant_vendor').on(table.tenantId, table.vendorId),
    index('idx_orders_checkout_group').on(table.tenantId, table.checkoutGroupId),
    index('idx_orders_tenant_customer').on(table.tenantId, table.customerId),
  ],
)
```

---

## Migration Strategy & Scripts

### 1. Fresh Start Migration (Current State - No Prod Data)

```sql
-- Step 1: Drop old sub-order junction tables
DROP TABLE IF EXISTS order_sub_order_items CASCADE;
DROP TABLE IF EXISTS order_sub_orders CASCADE;

-- Step 2: Add vendor_id and checkout_group_id directly to orders
ALTER TABLE orders 
  ADD COLUMN vendor_id UUID NOT NULL REFERENCES vendors(id),
  ADD COLUMN checkout_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN payout_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN tracking_number VARCHAR(100),
  ADD COLUMN tracking_url VARCHAR(500);

-- Step 3: Clean up vendor_ledger to reference order_id directly
ALTER TABLE vendor_ledger DROP COLUMN IF EXISTS sub_order_id;
```

### 2. Future Client Migration (With Legacy Data)

```sql
-- Convert existing legacy sub-orders into vendor-scoped orders seamlessly
INSERT INTO orders (tenant_id, vendor_id, customer_id, checkout_group_id, order_number, subtotal, total, status, payout_status)
SELECT 
  so.tenant_id,
  so.vendor_id,
  o.customer_id,
  o.id AS checkout_group_id, -- Original master order ID becomes the display checkoutGroupId
  CONCAT(o.order_number, '-', ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY so.id)),
  so.subtotal,
  so.subtotal,
  so.status,
  so.payout_status
FROM order_sub_orders so
JOIN orders o ON so.order_id = o.id;
```

---

## Business Logic Summary

1. **Checkout Flow (`placeOrder`)**:
   - Group cart items by `vendorId`.
   - Generate a single `checkoutGroupId = crypto.randomUUID()`.
   - Loop through each vendor group and create a distinct `order` record with `vendorId` and the common `checkoutGroupId`.

2. **Vendor Order Access**:
   - Query: `WHERE tenant_id = ? AND vendor_id = ?` (Simple filter, no joins required).

3. **Customer Order View**:
   - Query: `WHERE tenant_id = ? AND customer_id = ?`
   - UI groups orders sharing the same `checkoutGroupId` under a single checkout view.

4. **Vendor Ledger Integration**:
   - `vendor_ledger` entries link directly to `orders.id` via `orderId` foreign key.

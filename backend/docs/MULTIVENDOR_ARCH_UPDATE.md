# Multi-Vendor Architecture Enhancements (v2.0)

This document outlines the architectural changes required to transition the current multi-vendor implementation from a primitive "split-order" system to a production-ready marketplace with geographic routing, approval workflows, and automated settlements.

## 1. Split Shipping Engine (Consolidated Rates)
**Current State**: Single shipping rate for the whole order.
**Proposed State**: Each vendor's sub-order calculates its own shipping cost. The customer sees a summed total but can view the breakdown.

### Component Changes:
- **`ShippingService`**:
    - Add `calculateMultiVendor(items)` method.
    - Group items by `vendorId`.
    - Loop through groups, calculate rate for each using vendor-specific service areas.
- **Checkout Flows**:
    - Sum the individual vendor rates as `totalShippingAmount`.

---

## 2. Product Approval Workflow
**Current State**: Vendors can activate products immediately.
**Proposed State**: New products default to `PENDING` approval. Tenant admins must approve before they are visible in the storefront.

### Schema Changes (`catalog.schema.ts`):
```typescript
approvalStatus: varchar('approval_status', { length: 20 })
  .$type<'PENDING' | 'APPROVED' | 'REJECTED'>()
  .default('PENDING')
```

### Logic Changes:
- `CatalogService.listPublicProducts`: Filter by `approvalStatus = 'APPROVED'`.
- `VendorService`: Add `approveProduct(productId)` endpoint.

---

## 3. Automated Settlement Engine (Financial Batches)
**Current State**: Manual ledger entries and manual payout recording.
**Proposed State**: Sales are batched into weekly "Settlements" for easier accounting and bulk transfers.

### New Schema (`vendor.schema.ts`):
- **`vendor_settlements` table**:
    - `id`, `tenantId`, `vendorId`, `amount`, `commissionDeducted`, `payoutStatus`, `processedAt`.
- **`vendor_ledger` update**:
    - Add `settlementId` (Foreign Key to `vendor_settlements`).

### Logic Changes:
- **`SettlementService`**:
    - `generateSettlement(vendorId, dateRange)`: Sum all `SALE` entries where `settlementId IS NULL`.
    - Link entries to the generated settlement.

---

## 4. Vendor Notification Micro-Service
**Current State**: Silent order creation.
**Proposed State**: Vendors receive targeted notifications for their sub-orders.

### Implementation:
- Subscribe to `order.created` event.
- For each `orderSubOrder`, fetch vendor contact from `vendors` table.
- Send transactional email via provider (Resend/SES) with line-item breakdown.

---

## 5. Geographic Service Areas (Pincodes)
**Goal**: Restrict vendors to specific delivery zones.

### New Schema (`vendor.schema.ts`):
- **`vendor_service_areas` table**:
    - `id`, `vendorId`, `pincode`, `isActive`.

### Logic Changes:
- **Cart Validation**: In `placeOrder`, cross-reference customer `shippingAddress.pincode` with the supported pincodes of all vendors in the cart.
- Throw `NOT_SERVICEABLE` error at checkout if a vendor cannot serve the area.

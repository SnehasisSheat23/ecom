# PRD-M14 — Vendors

**Layer:** Vendor | **Phase:** 3 | **Estimate:** 5 days
**Depends on:** M01 (tenancy), M02 (auth), M03 (catalog), M04 (inventory), M07 (orders)
**Source:** `src/layers/vendor/`

---

## Context
Turns a standard store (Tenant) into a Multi-Vendor Marketplace. This module manages vendor profiles, account balances (ledger), and the automatic splitting of customer orders into vendor-specific sub-orders.

Within one tenant, multiple vendors are expected and supported. A single authenticated customer may also be a member of multiple vendors inside the same tenant, but any vendor-scoped write or fulfillment action must be performed against one explicitly selected active vendor context.

## 3-Tier Authorization (Core Philosophy)
1.  **SaaS Super Admin (Developer/Owner)**: Global platform access. Manages all tenants and high-level marketplace health.
2.  **Tenant Admin (Store Owner)**: Manages one store (tenant). Can modify all products, view all vendor sub-orders, and manage vendor access/commissions.
3.  **Vendor (Third-Party Seller)**: Restricted manager. Can only modify their own products/inventory and fulfill their own sub-orders.

## V1 Scope
- **Vendor Lifecycle**:
    - Invite-only onboarding (Tenant Admin adds external emails).
    - Vendor Status: `ACTIVE`, `SUSPENDED`, `ONBOARDING`.
    - Soft-delete only (maintain historical order references).
    - A tenant may create many vendors.
    - A customer may belong to many vendors within the same tenant through `vendor_members`.
- **Product Assignment**: Link products to vendors via `products.vendor_id`.
- **Order Splitting (R11)**:
    - On `order.created` event, automatically split line items by `vendor_id`.
    - Create `order_sub_orders` with vendor-specific tracking and status.
    - Every vendor-owned order item must belong to exactly one sub-order for the same `(tenant_id, order_id, vendor_id)`.
    - Items with `vendor_id = null` remain platform-owned and must not create a vendor sub-order.
- **Fulfillment**: Vendors update status for their sub-orders independently.
- **Ledger & Payouts**: 
    - Append-only `vendor_ledger` tracking vendor-facing financial movements only.
    - Commission: Fixed percentage platform fee per sale.
    - V1 accounting model: credit vendor net earnings after commission; keep fee details in ledger metadata and platform reporting, not as a second vendor-ledger row.
    - Digital balance tracking (with manual payout marking).

## Acceptance Criteria
- [ ] MULTI_VENDOR tenant: a cart with multiple vendors splits into N sub-orders.
- [ ] Vendor updates sub-order tracking → customer sees combined tracking dashboard.
- [ ] Permission check: Vendor A cannot see/edit Vendor B's inventory (403 Forbidden).
- [ ] Permission check: a customer who belongs to Vendor A and Vendor B can switch active vendor context and is scoped only to the selected vendor for vendor actions.
- [ ] Platform Fee: Total order value correctly split between vendor payout and platform revenue.

## Data Integrity Rules
- **R12**: Sub-orders are immutable once "Delivered."
- **R13**: Ledger balance is calculated only by summing ledger rows; no `balance` column on vendor.
- **R14**: Vendor membership is tenant-scoped many-to-many. Authorization must validate both tenant membership and the caller's explicitly selected active vendor.
- **R15**: Vendor financial writes must be idempotent. Reprocessing the same order or refund must not create duplicate ledger effects.

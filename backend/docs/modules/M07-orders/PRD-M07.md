# PRD-M07 — Orders

**Layer:** Core | **Phase:** 1 | **Estimate:** 3 days
**Depends on:** M01–M06
**Required by:** M08 (payment ties to order), M09 (coupon usage), M10 (order emails), M12 (loyalty earn), M14 (sub-orders)
**Source:** `src/modules/orders/`

---

## Context
Orders are the central transactional entity. Order placement is a 10-step atomic operation inside a single PostgreSQL transaction (Rule R7). Order items store full price snapshots (Rule R1). Addresses are copied as JSONB (Rule R2). Order numbers are human-readable, sequential per tenant (Rule R8).

## V1 Scope

### Atomic Order Placement (single DB transaction)
1. Validate cart: stock available, coupon valid (if applied), prices current
2. Lock inventory rows (`SELECT FOR UPDATE`) for tracked variants only
3. Create `orders` record — status `PENDING`
4. Create `order_items` with full price + product snapshot
5. If multi-vendor: emit `OrderCreatedEvent` → Vendor Layer creates sub-orders
6. Decrement inventory permanently (reserved → sold) for tracked variants only
7. Log coupon usage (if coupon applied)
8. Deduct loyalty points (if redeemed)
9. Create `payment_intent` record
10. Clear cart (mark as `converted`)

### Order Fields
- `order_number` — tenant-scoped sequential (`ORD-0001`, `ORD-0002`)
- `status`: `PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED`
- `customer_id FK` (null for guest orders)
- `guest_email, order_token UUID` — guest tracking
- `shipping_address_snapshot JSONB, billing_address_snapshot JSONB`
- `subtotal, discount_amount, shipping_amount, tax_amount(0), total`
- `coupon_code_snapshot VARCHAR, metadata JSONB`

### Order Items (Rule R1)
- `product_id FK, variant_id FK` — reference only
- `product_title_snapshot, variant_title_snapshot, sku_snapshot, unit_price_snapshot`
- `quantity, line_total, image_url_snapshot, vendor_id FK, metadata JSONB`

### Guest Tracking
- `GET /orders/track?token={uuid}` — no auth, returns order status + items

### Order Status Machine
```
PENDING → CONFIRMED (on payment.captured)
CONFIRMED → PROCESSING (admin action)
PROCESSING → SHIPPED (admin/vendor action)
SHIPPED → DELIVERED (admin/vendor action)
PENDING → CANCELLED (customer/admin)
CONFIRMED → CANCELLED (admin only)
```
Invalid transitions rejected.

## Out of Scope
- Returns / refund workflow
- Order editing after placement
- Recurring orders / subscriptions
- Split payment across methods

## API Contracts
```
POST   /orders                        — Place order from cart
GET    /orders                        — List my orders (authenticated)
GET    /orders/:id                    — Get order detail
POST   /orders/:id/cancel             — Cancel order (PENDING/CONFIRMED only)
GET    /orders/track?token={uuid}     — Guest tracking
PATCH  /admin/orders/:id/status       — Admin status update
GET    /admin/orders                  — Admin order list (filterable)
```

## Business Logic Rules
1. Entire placement in one `db.transaction()` — any failure = full rollback (R7)
2. Order items store full snapshot — never join catalog for pricing (R1)
3. Address copied as JSONB — not FK (R2)
4. Order number generated via Postgres sequence per tenant (R8)
5. Only PENDING orders can be cancelled by customer
6. CONFIRMED orders can be cancelled only by admin
7. Status transitions must follow state machine — reject invalid
8. Guest orders require `guest_email` for notification delivery
9. On cancellation: restore inventory for tracked variants, void loyalty points

## Acceptance Criteria
- [ ] Full checkout: cart → order → inventory decremented → payment_intent created → cart cleared
- [ ] Full checkout with untracked variant: order succeeds without inventory reservation/decrement
- [ ] Payment failure: order stays PENDING, inventory still decremented
- [ ] Guest tracks order via token without login
- [ ] Out-of-stock during checkout → order rejected, even under concurrent load
- [ ] Order items have full price snapshot — product price change doesn't affect order
- [ ] Human-readable order number incrementing per tenant
- [ ] Invalid status transition rejected

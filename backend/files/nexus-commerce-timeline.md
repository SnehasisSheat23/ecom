# NEXUS COMMERCE — Build Timeline
**Version:** 1.0 | **Last Updated:** 2026-03
**Reference:** Master PRD v2.1

---

## How to Use This File

This file is the single source of truth for **what to build and in what order**.

- Each module has an entry with: days, what it unlocks, what must be done before it, and a done-when definition
- Work strictly left to right within each phase — do not start M04 before M03 schema is stable
- The "done-when" definition is your acceptance gate before moving to the next module
- **Ship Phase 1 to a real client before starting Phase 2**

---

## Visual Build Order

```
Phase 1 — MVP Single-Vendor Store (~2.5 weeks)
─────────────────────────────────────────────────────────────────────
M01 → M02 → M03 → M04 → M05 → M06 → M07 → M08
 1d    2d    3d    1d    1d    2d    3d    2d
                                            │
                                     [MILESTONE: Ship one live store]
                                            │
Phase 2 — Retention & Marketing (~1.5 weeks)
─────────────────────────────────────────────────────────────────────
                                            ↓
                                M09 → M10 → M11
                                 1.5d  1d   1d
                                       │
                                M12 → M13
                                 1.5d  1.5d
                                            │
                                     [MILESTONE: Full single-vendor feature set]
                                            │
Phase 3 — Multi-Vendor, Search & Admin (~1.5 weeks)
─────────────────────────────────────────────────────────────────────
                                            ↓
                                M14 → M15 → M16
                                 2d   1.5d   3d
                                            │
                                     [MILESTONE: All 3 multi-vendor tenants live]
                                            │
Phase 4 — Storefront (~2 weeks)
─────────────────────────────────────────────────────────────────────
                                            ↓
                                Next.js default storefront
                                 Tenant-aware theming
                                 ISR catalog pages
                                 SEO metadata
                                            │
                                     [MILESTONE: Full platform live]
```

---

## Phase 1 — MVP Single-Vendor Store

**Goal:** One working store end-to-end. Customer can browse, add to cart, checkout, pay.
**Target:** 13 focused dev days (~2.5 weeks)
**Gate:** Do not start Phase 2 until a real store is live on this.

---

### M01 — Tenant Management
**Days:** 1 | **Order:** First, always
**Blocks:** Every single module depends on this

**Must build:**
- `tenants` table with all config columns and schema hooks
- `tenant_payment_config` table (even if Razorpay only in v1)
- Domain resolution middleware: hostname → `tenant_id`
- RLS: Postgres policy + middleware sets `SET LOCAL app.tenant_id`
- `TenantContext` interface exported and used by all subsequent modules
- Tenant-prefixed Redis key helpers (`src/lib/redis-keys.ts`)
- Tenant-prefixed storage path helpers (`src/lib/storage-paths.ts`)
- Tenant-prefixed BullMQ queue name helpers (`src/lib/queue-names.ts`)

**Done when:**
- Middleware correctly resolves tenantId from subdomain and custom domain
- RLS policy blocks cross-tenant data access (write a test for this)
- `TenantContext` hydrated correctly on every request
- All three helper files (`redis-keys`, `storage-paths`, `queue-names`) in place

**Common mistake:** Don't skip the helper files. If queue names, Redis keys, and storage paths aren't prefixed from day one, you will have a painful migration at tenant #15.

---

### M02 — Auth & Customers
**Days:** 2 | **Order:** After M01
**Blocks:** M06 (cart auth), M07 (order customer), M12 (loyalty)

**Must build:**
- `customers` table, `addresses` table
- `guest_sessions` table (UUID, linked to cart)
- Register, login, refresh token endpoints
- Google OAuth via Supabase Auth
- JWT middleware: `auth.middleware.ts`
- Password reset flow (Resend integration happens in M10 — stub for now, log to console)
- Address CRUD endpoints

**Done when:**
- Customer can register, login, logout
- Guest session created on first request
- JWT middleware correctly validates tokens and rejects expired ones
- Address CRUD works
- Tenant isolation: same email registers independently across two tenants

---

### M03 — Catalog
**Days:** 3 | **Order:** After M01
**Blocks:** M04, M06, M07, M15

**Must build:**
- `products`, `variants`, `categories`, `product_images`, `product_categories` tables
- All schema hooks columns present (tax_class, weight, price_history table)
- R2/S3 upload endpoint: `StorageProvider` interface + R2 implementation
- Product CRUD (admin-only endpoints)
- Variant CRUD
- Category tree management
- Public storefront endpoints: list products (paginated), get product by slug, list categories

**Done when:**
- Create a product with 3 variants and 2 categories via API
- Soft delete a product — it disappears from public listing but is still in DB
- Upload an image to R2, URL stored in `product_images`
- Public listing endpoint returns only active products for the correct tenant
- Cross-tenant test: tenant A cannot see tenant B's products

**Note on M03 timing:** Start M03 at the same time as M02 (they are independent). Both can run in parallel on day 2. M03 takes 3 days so start it early.

---

### M04 — Inventory
**Days:** 1 | **Order:** After M03 schema is stable
**Blocks:** M06 (reservation), M07 (decrement)

**Must build:**
- `inventory` table per variant
- `inventory_history` table (append-only, schema hook — write to it from day 1)
- `inventory.repository.ts` — all inventory mutations go through here, nowhere else
- Reservation: decrement `available`, increment `reserved`, schedule BullMQ release job
- Release: restore `available`, decrement `reserved`
- Permanent decrement (called by M07 only — expose as a service method)
- Restore on cancellation (called by M07 only)

**Done when:**
- Add item to cart → inventory reserved
- Remove item → inventory released
- Simulate two concurrent requests for the last unit — only one succeeds (test with `Promise.all`)
- `inventory_history` has an entry for every change

---

### M05 — Shipping
**Days:** 1 | **Order:** After M01 (needs tenant config)
**Blocks:** M06, M07 (pricing pipeline)

**Must build:**
- `shipping_zones` table (structure only — one default zone in v1)
- `shippingModule.calculate(items, address, tenant): ShippingResult`
- Returns `{ label: 'Standard Shipping', description: '3–5 days', estimated_days: 5, amount: 49 }`
- Free shipping threshold logic from tenant config
- Wire into pricing pipeline (`src/lib/pricing.ts`)

**Done when:**
- `calculate()` returns correct flat rate for tenant config
- Returns `amount: 0` when order exceeds free shipping threshold
- Pricing pipeline returns correct total including shipping

---

### M06 — Cart
**Days:** 2 | **Order:** After M02, M03, M04, M05
**Blocks:** M07

**Must build:**
- `carts`, `cart_items` tables
- `saved_for_later_items` table (schema hook — columns only, no endpoints yet)
- Guest cart creation + item management
- Authenticated cart creation + item management
- Cart merge on login
- Price re-validation on checkout initiation
- Apply coupon (stub — returns 0, wire real logic in M09)
- Apply loyalty points (stub — returns 0, wire real logic in M12)
- Cart expiry BullMQ job (7-day inactivity)
- Total calculation via pricing pipeline
- Redis cart cache (source of truth stays in Postgres)

**Done when:**
- Guest adds items, logs in, cart merges correctly
- Price re-validation notice fires when price changed since add
- Cart total matches: `subtotal - discount(0) + shipping + tax(0)`
- Cart expires after inactivity, inventory reservations released
- Redis cache returns same data as Postgres

---

### M07 — Orders
**Days:** 3 | **Order:** After M06
**Blocks:** M08

**Must build:**
- `orders`, `order_items`, `order_sub_orders` tables (sub_orders table — schema present even if not used until M14)
- Human-readable order number sequence per tenant
- `placeOrder()` — full atomic transaction (all 10 steps from spec)
- Order status state machine with valid transitions only
- Guest order tracking endpoint
- Order cancellation (PENDING/CONFIRMED only)
- Admin order status update endpoint

**Done when:**
- Full checkout flow: cart → place order → inventory decremented → payment_intent created → cart cleared
- Simulate payment failure: order stays PENDING, inventory still decremented (payment will update)
- Guest can track order via token without logging in
- Order cannot be placed when item is out of stock (even under concurrent load)
- Order items have full price snapshot — product price can be changed, order total unchanged

---

### M08 — Payments
**Days:** 2 | **Order:** After M07
**Milestone after this:** Ship a real store

**Must build:**
- `payment_intents`, `payment_events`, `tenant_payment_config` tables
- `PaymentProvider` interface (`src/providers/payment/payment.interface.ts`)
- `RazorpayProvider` class implementing the interface
- `PaymentFactory` — resolves provider from tenant config
- `PaymentService` — the only interface modules call
- `POST /webhooks/razorpay/{tenantId}` — signature verified, idempotent
- Full webhook processing flow per Section 8.5 of Master PRD
- `StripeProvider` stub file (empty class, all methods throw NotImplemented) — just the file
- Idempotency middleware (`src/lib/idempotency.ts`)

**Done when:**
- Full payment flow: create order → initiate payment → Razorpay webhook arrives → order CONFIRMED
- Send same webhook twice — second is no-op, order not double-confirmed
- Payment fails — order stays PENDING, customer can initiate new payment
- Invalid webhook signature returns 401
- All failure scenarios from Section 8.7 of Master PRD tested

**Phase 1 complete. Ship a real store now.**

---

## Phase 2 — Retention & Marketing

**Goal:** Coupons, emails, abandonment recovery, loyalty, reviews.
**Target:** ~7.5 focused dev days
**Rule:** M09 and M10 can be built in parallel. M11 needs both. M12 needs M10.

---

### M09 — Discounts & Coupons
**Days:** 1.5 | **Order:** After Phase 1
**Unlocks:** Coupon support in cart + orders

**Must build:**
- `coupons`, `coupon_usages` tables
- Coupon CRUD (admin)
- Apply coupon to cart (replace stub in M06)
- Log coupon usage in M07 order placement (add to transaction)
- Stacking rule enforcement

**Done when:**
- Create 10%-off coupon → apply to cart → total correct
- Use coupon 3 times → 4th use blocked by `per_customer_usage_limit`
- Expired coupon rejected
- Minimum order value enforced
- Usage logged to `coupon_usages` on order placement

---

### M10 — Notifications
**Days:** 1 | **Order:** After Phase 1
**Unlocks:** All transactional emails, required by M11 and M12

**Must build:**
- `notification_templates`, `notification_log` tables
- `NotificationProvider` interface + `ResendProvider` implementation
- Default HTML templates for all 9 events
- `NotificationService.send()` — always enqueues BullMQ job, never sends inline
- BullMQ notification worker
- Wire into M07: `order.confirmed` on payment captured, `order.shipped`, `order.delivered`, `order.cancelled`
- Wire into M02: `auth.welcome`, `auth.email_verify`, `auth.password_reset` (replace console.log stub)

**Done when:**
- Place an order → confirmation email received
- All 9 event types render templates correctly with real data
- Failed notification job lands in DLQ, does not crash main flow
- Notification log has entry for every send attempt

---

### M11 — Cart Abandonment
**Days:** 1 | **Order:** After M09 and M10
**Unlocks:** Recovery email flow

**Must build:**
- `abandoned_cart_events` table
- BullMQ job scheduled on cart create/update
- Job logic: check order placed → if not, call M10 `cart.abandoned`
- Cancel/reschedule job on cart activity
- Recovery URL handler: `/cart/recover?token={cart_token}`
- Recovery detection: mark `recovered = true` when order placed via recovery token

**Done when:**
- Create cart, wait simulated 2hr (use short TTL in test env) → abandonment email received
- Place order before timer fires → no email sent
- Use recovery URL → cart restored → place order → marked as recovered
- Multiple cart updates → only one final job fires (debounced correctly)

---

### M12 — Loyalty
**Days:** 1.5 | **Order:** After M10
**Unlocks:** Points earn/redeem at checkout

**Must build:**
- `loyalty_ledger` table (append-only)
- DB trigger or service guard: reject UPDATE/DELETE on `loyalty_ledger`
- Balance calculation query: `SUM(delta) WHERE expires_at > NOW()`
- Earn: BullMQ job enqueued when order → DELIVERED
- Redeem: replace stub in M06 cart total, deduct in M07 transaction
- Void: negative delta entry on order cancellation
- Customer endpoints: balance, paginated history

**Done when:**
- Place order → deliver it → points appear in ledger
- Redeem points at checkout → cart total reduced correctly
- Cancel order → points voided (negative entry, not delete)
- Balance query is correct after multiple earn/void/redeem cycles
- Attempt to UPDATE a loyalty_ledger row → rejected

---

### M13 — Reviews
**Days:** 1.5 | **Order:** After Phase 1
**Unlocks:** Verified-purchase reviews on storefront

**Must build:**
- `reviews` table
- Submit review (must have DELIVERED order item for product)
- Moderation endpoints (admin): approve, reject
- `avg_rating` update on product on approve/reject
- Helpful vote endpoint
- Public listing: approved only, sorted newest / most helpful

**Done when:**
- Customer without purchase cannot submit review
- Customer with purchase submits → status PENDING
- Admin approves → visible on storefront, avg_rating updated
- Admin rejects → not visible
- Helpful vote increments count

---

## Phase 3 — Multi-Vendor, Search & Admin

**Goal:** Multi-vendor tenants live, search working, full admin panel.
**Target:** ~6.5 focused dev days

---

### M14 — Vendors
**Days:** 2 | **Order:** After Phase 1 and M03
**Unlocks:** Multi-vendor tenants

**Must build:**
- `vendors`, `vendor_members` tables
- Vendor onboarding state machine: `PENDING → VERIFIED → SUSPENDED`
- Vendor admin role + scoped access
- `OrderCreatedEvent` subscriber: creates `order_sub_orders` on order placement
- Vendor-scoped catalog: all product queries filter by `vendor_id` for vendor admins
- Vendor sales summary view (read-only aggregation)
- Vendor sub-order status update (PROCESSING → SHIPPED)

**Done when:**
- Create vendor → approve → vendor admin can log in
- Vendor admin can only see/edit their own products
- Place order with items from 2 vendors → 2 sub-orders created atomically
- Vendor admin updates sub-order to SHIPPED → notification fires
- Tenant admin sees both sub-orders; vendor admin sees only theirs

---

### M15 — Search
**Days:** 1.5 | **Order:** After M03 stable
**Unlocks:** Faceted product search on storefront

**Must build:**
- Typesense Docker setup / Railway service
- `SearchProvider` interface + `TypesenseProvider` implementation
- Tenant collection creation on tenant onboarding
- Sync BullMQ job: product create/update/delete → Typesense index
- Backfill script: index all existing products on setup
- Search endpoint: `GET /search?q=&category=&price_min=&price_max=&vendor=&sort=`
- Facets returned in search response

**Done when:**
- Create product → appears in search within 5 seconds
- Search "blue shirt" → returns relevant results with typo tolerance
- Filter by category + price range → correct results
- Tenant A's products not returned in Tenant B's search
- Search returns facet counts for category, price ranges

---

### M16 — Admin (Payload CMS)
**Days:** 3 | **Order:** After all other modules
**Unlocks:** Client self-service admin

**Must build:**
- Payload CMS wired to existing PostgreSQL schema (not separate DB)
- Three roles: SUPER_ADMIN, TENANT_ADMIN, VENDOR_ADMIN
- Collections: Products, Orders, Customers, Inventory, Coupons, Vendors, Templates, Pages
- Role-based access control per collection
- Payment config management (encrypted credentials)

**Done when:**
- TENANT_ADMIN can manage products, orders, inventory, coupons
- VENDOR_ADMIN can only see their own products and sub-orders
- SUPER_ADMIN can manage all tenants
- Order status update in admin fires correct notification
- Notification template editable per event per tenant

---

## Phase 4 — Storefront

**Reference:** `STOREFRONT-PRD.md` (separate document — not covered here)
**Target:** ~10–14 focused dev days

**Summary of what to build:**
- Next.js app with tenant middleware (hostname → tenant config)
- ISR pages: `/`, `/products`, `/products/[slug]`, `/vendors/[slug]`, `/pages/[slug]`
- CSR pages: `/cart`, `/checkout`, `/order/confirm/[id]`, `/orders/track`, `/account`
- Tenant-aware theming from branding config
- SEO: canonical, OG tags, JSON-LD on all catalog pages
- Sitemap + robots.txt per tenant

---

## Total Timeline Summary

| Phase | Modules | Dev Days | Cumulative |
|-------|---------|----------|------------|
| Phase 1 — MVP | M01–M08 | 13 days | 13 days |
| Phase 2 — Retention | M09–M13 | 7.5 days | 20.5 days |
| Phase 3 — Multi-Vendor | M14–M16 | 6.5 days | 27 days |
| Phase 4 — Storefront | — | 12 days | 39 days |
| Buffer (bugs, integration) | — | 7 days | 46 days |
| **Total focused** | | | **~46 days / ~9–10 weeks** |
| **With college** | | | **~13–15 weeks** |

---

## Parallel Work Opportunities

These modules can be built simultaneously if you have help or want to context-switch:

| Parallel Pair | Notes |
|---------------|-------|
| M02 + M03 | Both depend only on M01. Start both on day 2. |
| M04 + M05 | Both depend only on M01/M03. Can run together. |
| M09 + M10 | Both depend only on Phase 1. Start both at Phase 2 start. |
| M12 + M13 | M12 needs M10; M13 is independent. Start M13 immediately in Phase 2. |
| M14 + M15 | Both need stable M03. Can run in parallel. |

---

## Module Dependency Rules (enforce strictly)

Do not start a module until its dependencies are complete and their schemas are stable. Schema changes cascade.

```
M01 must be done before: everything
M02 must be done before: M06, M07, M12
M03 must be done before: M04, M06, M07, M15
M04 must be done before: M06, M07
M05 must be done before: M06, M07
M06 must be done before: M07, M11
M07 must be done before: M08
M08 must be done before: shipping to real users
M10 must be done before: M11, M12 (notification sends)
M14 must be done before: multi-vendor tenants go live
All Phase 1–3 modules before: M16 (admin wraps everything)
```

---

## Definition of "Done" for Each Phase

**Phase 1 done:**
- [ ] Customer can register, browse products, add to cart, checkout, pay with Razorpay
- [ ] Guest checkout works end-to-end
- [ ] Payment failure leaves order in PENDING, customer can retry
- [ ] Duplicate webhook does not double-confirm order
- [ ] Cross-tenant isolation verified (tenant A cannot see tenant B's data)
- [ ] One real client store is live on this

**Phase 2 done:**
- [ ] Coupon codes work at checkout, usage correctly limited
- [ ] Order confirmation email received within 60 seconds of payment
- [ ] Abandonment email fires 2 hours after cart is abandoned
- [ ] Loyalty points earned on delivery, redeemable at checkout
- [ ] Reviews only submittable by verified purchasers

**Phase 3 done:**
- [ ] Multi-vendor tenant has 2+ vendors onboarded
- [ ] Order with items from 2 vendors creates correct sub-orders
- [ ] Vendor admin can only see their own data
- [ ] Search returns correct results with facets for all tenants
- [ ] Tenant admin can manage full store from Payload admin panel

**Phase 4 done:**
- [ ] All 10 tenants using single Next.js storefront
- [ ] ISR pages load under 1s (cached)
- [ ] Product pages have correct JSON-LD schema (validate with Google Rich Results Test)
- [ ] Sitemap accessible at `/sitemap.xml` for each tenant
- [ ] Core Web Vitals: LCP < 2.5s on mobile

---

*Nexus Commerce — Build Timeline v1.0 | Confidential*

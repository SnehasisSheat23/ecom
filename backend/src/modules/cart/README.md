# Cart Module Architecture Reference (AI-Agent & Developer Guide)

This document provides a comprehensive technical specification for the **Cart** module in OpenShutter. It defines database schemas, cart lifecycle rules, dual-layer expiration mechanisms, inventory reservation release policies, caching, domain events, and REST API endpoints so that AI agents and engineers can inspect, extend, or consume this module without parsing the entire codebase.

---

## AI Agent & Developer Directives

> [!IMPORTANT]
> **DOC MAINTENANCE MANDATE**: Whenever cart service methods, repository queries, expiration job handlers, validation schemas, or event names are modified, **you MUST update this README file** to keep architecture details, method signatures, error codes, and endpoint references accurate.

---

## 1. File Map & Directory Structure

```
src/modules/cart/
├── cart.schema.ts               # Core database schemas (carts, cart_items)
├── cart.types.ts                # Domain interfaces, DTOs, Owner types, Snapshots
├── cart.repository.ts           # Drizzle SQL repository, SELECT FOR UPDATE locking, batch queries
├── cart.service.ts              # Business logic, price reconciliation, inventory reservation, cache eviction
├── cart.jobs.ts                 # Delayed cart expiration job payloads & schedulers
├── cart.routes.ts               # Storefront & internal HTTP endpoints
├── cart.validators.ts           # Zod schemas for cart payloads (add/update item, coupon, loyalty, checkout)
├── cart.test.ts                 # Vitest test suite for cart lifecycle & cleanup
└── module.json                  # Module metadata declaration
```

---

## 2. Database Schema Specification

### `carts` Table Schema
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, Default `gen_random_uuid()` | Unique Cart ID |
| `tenant_id` | `uuid` | `NOT NULL`, FK `tenants(id)` | Tenant Scope |
| `customer_id` | `uuid` | Nullable, FK `customers(id)` | Customer ID (if logged in) |
| `guest_session_id` | `varchar(255)` | Nullable | Guest Session ID (if guest cart) |
| `status` | `varchar(20)` | `NOT NULL`, Default `'active'` | `'active'` \| `'converted'` \| `'expired'` |
| `coupon_code` | `varchar(50)` | Nullable | Applied Coupon Code |
| `loyalty_points` | `integer` | `NOT NULL`, Default `0` | Redeemed Loyalty Points |
| `selected_shipping_option_id` | `varchar(100)` | Nullable | Selected shipping rate ID |
| `subtotal` | `integer` | `NOT NULL`, Default `0` | Subtotal in smallest currency unit (cents/paise) |
| `shipping_amount` | `integer` | `NOT NULL`, Default `0` | Calculated shipping cost |
| `discount_amount` | `integer` | `NOT NULL`, Default `0` | Calculated discount amount |
| `total` | `integer` | `NOT NULL`, Default `0` | `subtotal - discount_amount + shipping_amount` |
| `expires_at` | `timestamp` | `NOT NULL` | Expiration timestamp (Default `NOW() + 7 days`) |
| `metadata` | `jsonb` | `NOT NULL`, Default `'{}'` | Extensible metadata |
| `created_at` | `timestamp` | `NOT NULL`, Default `NOW()` | Creation timestamp |
| `updated_at` | `timestamp` | `NOT NULL`, Default `NOW()` | Last update timestamp |

### `cart_items` Table Schema
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, Default `gen_random_uuid()` | Unique Line Item ID |
| `tenant_id` | `uuid` | `NOT NULL`, FK `tenants(id)` | Tenant Scope |
| `cart_id` | `uuid` | `NOT NULL`, FK `carts(id)` ON DELETE CASCADE | Associated Cart ID |
| `variant_id` | `uuid` | `NOT NULL`, FK `variants(id)` | Associated Catalog Variant ID |
| `partner_id` | `uuid` | Nullable, FK `vendors(id)` | Vendor Scope (for multi-vendor carts) |
| `product_type` | `varchar(50)` | `NOT NULL`, Default `'physical'` | `'physical'` \| `'digital'` |
| `product_title_snapshot` | `varchar(255)` | `NOT NULL` | Frozen product title at add-time |
| `quantity` | `integer` | `NOT NULL` | Item quantity |
| `unit_price` | `integer` | `NOT NULL` | Unit price at time of item insertion |
| `line_total` | `integer` | `NOT NULL` | `quantity * unit_price` |
| `metadata` | `jsonb` | `NOT NULL`, Default `'{}'` | Custom item options (e.g. engraving, options) |
| `created_at` | `timestamp` | `NOT NULL`, Default `NOW()` | Creation timestamp |
| `updated_at` | `timestamp` | `NOT NULL`, Default `NOW()` | Last update timestamp |

---

## 3. Cart Lifecycle & Dual-Layer Expiry Architecture

```
[ Cart Activity ] ──► Extends expiresAt to NOW() + 7 Days
      │
      ├─────────────────────────┬─────────────────────────┐
      ▼                         ▼                         ▼
[ Real-Time Queue Job ]  [ Daily Batch Sweep ]    [ Checkout Converted ]
 7-Day Delayed Timer       Nightly Cron Job         Mark status = 'converted'
      │                         │                         │
      └───────────┬─────────────┘                         │
                  ▼                                       ▼
          [ expireCart() ]                     [ Complete Order ]
          • Release Inventory
          • Update status = 'expired'
          • Invalidate Cache
          • Emit event 'cart.expired'
```

### Dual-Layer Expiry Protection
1. **Layer 1: Real-Time Queue Job (`createCartExpiryJob`)**
   - Every cart modification triggers `scheduleExpiry(tenantId, cartId)`.
   - Schedules a 7-day delayed job via `JobQueueProvider` targeting `/internal/jobs/cart/expiry`.
2. **Layer 2: Daily Batch Safety Sweep (`cleanupExpiredCarts`)**
   - Nightly CRON job invokes `POST /internal/jobs/cart/cleanup`.
   - Queries active carts where `expires_at < NOW()` via `findExpiredActiveCarts(limit = 100)` and expires them safely in batches.

### Expiration Side-Effects (`expireCart`)
When a cart expires, the system executes:
1. **Inventory Release**: For all items with `trackInventory: true`, reserved inventory is safely released back to available stock in a database transaction (`releaseInventoryInTransaction`).
2. **Database Status Update**: Updates `status = 'expired'` and `expiresAt = NOW()`.
3. **Cache Eviction**: Deletes the cached cart view from `CacheProvider` (`in-memory` or `upstash-redis`).
4. **Domain Event**: Publishes `'cart.expired'` payload `{ tenantId, cartId }` to `EventPublisher`.

---

## 4. REST API Endpoint Reference

### Storefront Cart Endpoints
| Method | Endpoint | Auth Scope | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Guest Session / Customer | Retrieve current active cart with live price reconciliation |
| `POST` | `/cart/items` | Guest Session / Customer | Add item to active cart (reserves inventory) |
| `PATCH` | `/cart/items/:id` | Guest Session / Customer | Update item quantity |
| `DELETE` | `/cart/items/:id` | Guest Session / Customer | Remove item from cart (releases reserved inventory) |
| `POST` | `/cart/coupon` | Guest Session / Customer | Apply coupon code |
| `DELETE` | `/cart/coupon` | Guest Session / Customer | Remove applied coupon |
| `POST` | `/cart/loyalty` | Guest Session / Customer | Redeem loyalty points for discount |
| `DELETE` | `/cart/loyalty` | Guest Session / Customer | Remove redeemed loyalty points |
| `POST` | `/cart/checkout` | Guest Session / Customer | Checkout cart and prepare order details |

### Internal Job Endpoints
| Method | Endpoint | Auth Scope | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/internal/jobs/cart/expiry` | QStash Signature / Internal | Single cart delayed expiration callback |
| `POST` | `/internal/jobs/cart/cleanup` | QStash Signature / Internal | Daily batch safety sweep for expired active carts |

---

## 5. System Error Codes Reference

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `cart-not-found` | 404 | Cart record does not exist for specified owner. |
| `cart-expired` | 409 | Attempted operation on an expired cart. |
| `insufficient-stock` | 409 | Requested quantity exceeds available inventory stock. |
| `invalid-coupon` | 400 | Coupon code is invalid, expired, or criteria not met. |
| `invalid-loyalty` | 400 | Insufficient loyalty point balance for redemption. |

# Glossary

Consistent terminology used across all Nexus Commerce documentation.

| Term | Definition | Used In |
|------|-----------|---------|
| **Tenant** | A store owner/business using the Nexus Commerce platform. Each tenant gets isolated data via explicit application-level filtering. | All modules |
| **Tenant Context** | The `TenantContext` object injected into every request by the tenancy middleware. Contains config, features, payment info. | All modules, `CONTRACTS.md` |
| **RLS** | Row-Level Security. PostgreSQL feature formerly used for isolation; now replaced by explicit application-level filtering for better compatibility with connection pooling. | M01, `MASTER-PRD.md` §3, §4 |
| **Variant** | A purchasable unit of a product. Every product has at least one variant (default). Variants hold SKU, price, and inventory. | M03, M04, M06, M07 |
| **Product** | A displayable item in the catalog. Not directly purchasable — customers buy variants. | M03, M06, M07, M15 |
| **Category** | A hierarchical grouping for products. Nested tree via `parent_id`, max depth 3. | M03, M15 |
| **Cart** | A collection of variant+quantity pairs for a customer or guest. Source of truth in PostgreSQL, cached in Upstash Redis by default. | M06, M07, M11 |
| **Guest Session** | A UUID-based session for unauthenticated users. Linked to a cart. Merged into customer account on login. | M02, M06 |
| **Order** | A confirmed purchase. Created atomically from a cart in a single DB transaction. | M07, M08, M14 |
| **Order Item** | A line item within an order. Stores full price snapshot — never joins catalog for pricing. | M07 |
| **Sub-Order** | A vendor-scoped portion of an order in multi-vendor tenants. Created by the vendor layer on `OrderCreatedEvent`. | M07, M14 |
| **Payment Intent** | A record of a payment attempt for an order. One order can have multiple intents (retries). | M07, M08 |
| **Payment Event** | An append-only log entry for every webhook received from a payment provider. Idempotent via unique constraint. | M08 |
| **Schema Hook** | A column or table present in the database from day one but unused in v1. Allows deferred features to be activated without migrations. | All modules |
| **Provider** | An abstracted external service (payment, email, storage, search). Modules interact via interfaces, never SDKs directly. | M08, M10, M03, M15 |
| **Provider Interface** | A TypeScript interface (`PaymentProvider`, `NotificationProvider`, etc.) that normalizes provider-specific behavior. | `CONTRACTS.md` |
| **Idempotency Key** | A unique identifier ensuring that retried operations produce the same result. Used on webhooks and critical API endpoints. | M08, `MASTER-PRD.md` §8 |
| **Pricing Pipeline** | The central `calculateOrderTotal()` function that computes subtotal, discount, shipping, tax, and total. | M05, M06, M07, M09, M12 |
| **Price Snapshot** | The price, title, SKU, and variant title stored on order items at purchase time. Never changes after order creation. | M07 |
| **Address Snapshot** | The full shipping/billing address stored as JSONB on orders. Not an FK — addresses can change; order history must not. | M07 |
| **Soft Delete** | Setting `deleted_at` timestamp instead of removing a row. Required on products, variants, customers, vendors. | M02, M03, M14 |
| **Append-Only Ledger** | A table where rows are only inserted, never updated or deleted. Balance = `SUM(delta)`. Used for `loyalty_ledger` and `payment_events`. | M08, M12 |
| **Coupon** | A discount code with type (fixed/percentage), usage limits, validity period, and scope (all/specific products/categories). | M09 |
| **Loyalty Points** | Earned on order delivery, redeemable at checkout. Tracked in append-only ledger with per-entry expiry. | M12 |
| **Vendor** | A seller in a multi-vendor marketplace tenant. Has own products, sub-orders, and admin access. | M14 |
| **Feature Flag** | A boolean in tenant config that enables/disables optional features (wishlist, loyalty, reviews, cart abandonment). | M01 |
| **QStash** | Upstash's serverless HTTP queue and scheduler. Default async transport for delayed jobs, retries, and webhook-style worker delivery. | M04, M06, M08, M10, M11, M15 |
| **BullMQ** | Redis-backed worker queue kept as a portability target for non-serverless deployments, not the default runtime choice. | ADR-004 |
| **DLQ** | Dead Letter Queue. Where failed async deliveries land after max retries. Must be monitored regardless of transport. | All queue-using modules |
| **ISR** | Incremental Static Regeneration. Next.js feature used by the storefront to cache catalog pages. | Storefront (Phase 4) |

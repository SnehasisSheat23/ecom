# NEXUS COMMERCE — Master PRD v2.1
**Multi-Tenant E-Commerce Engine**
**Status:** Draft | **Version:** 2.1 | **Last Updated:** 2026-03

---

## COVERAGE SCOPE

This document covers the **backend engine only**:
- REST API (Hono / Node.js)
- Database schema (PostgreSQL / Drizzle)
- All 16 backend modules
- Payment provider abstraction layer
- Infrastructure and scalability architecture
- Self-hosting portability

**Not covered here (separate documents):**
- `STOREFRONT-PRD.md` — Next.js storefront, pages, components, theming
- `ADMIN-PRD.md` — Payload CMS admin panel detail
- `DESIGN-MXX.md` files — per-module schema DDL and API contracts
- `TASKS-MXX.md` files — atomic dev task lists per module

---

## HOW TO USE THIS DOCUMENT (AI Agents — Read First)

This is the single source of truth for engine architecture. It is structured so that:

- An agent fixing a bug in Module 7 reads: `MASTER-PRD.md` (Sections 3, 4, 6) + `PRD-M07.md` + `DESIGN-M07.md`. Nothing else.
- An agent adding a new payment provider reads: Section 8 (Payment Layer) + `PRD-M08.md` + `DESIGN-M08.md`. Nothing else.
- An agent scaling to 100 stores reads: Section 5 (Scalability). Nothing else.

### Document Hierarchy

```
MASTER-PRD.md                    ← Architecture, principles, module index, payment spec
│
├── PRD-M01 → PRD-M16            ← What to build per module + acceptance criteria
├── DESIGN-M01 → DESIGN-M16      ← Schema DDL, API contracts, sequence diagrams
├── TASKS-M01 → TASKS-M16        ← Atomic dev tasks, each independently actionable
│
├── TIMELINE.md                  ← Build order, phases, day-by-day plan (separate file)
├── STOREFRONT-PRD.md            ← Frontend spec (separate, not in this doc)
└── SELF-HOSTING.md              ← Self-hosting guide for store owners
```

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Design Principles](#2-core-design-principles)
3. [System Architecture](#3-system-architecture)
4. [Layer Architecture — Plug-and-Play](#4-layer-architecture--plug-and-play)
5. [Scalability — 10 to 100+ Stores](#5-scalability--10-to-100-stores)
6. [Portability — Self-Hosting](#6-portability--self-hosting)
7. [Data Integrity Rules](#7-data-integrity-rules)
8. [Payment Layer — Provider-Agnostic Spec](#8-payment-layer--provider-agnostic-spec)
9. [Core Data Model](#9-core-data-model)
10. [Module Index](#10-module-index)
11. [Module Specifications](#11-module-specifications)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Infrastructure & Cost](#13-infrastructure--cost)
14. [Tenant Offboarding & Data Export](#14-tenant-offboarding--data-export)
15. [Open Questions](#15-open-questions)
16. [Appendix — Sub-PRD Templates](#16-appendix--sub-prd-templates)

---

## 1. Executive Summary

Nexus Commerce is a **three-layer, plug-and-play, provider-agnostic e-commerce engine** built to:

- Run 10 client stores from a single deployment at under $60/month
- Scale to 100+ stores without architectural changes
- Allow any store owner to self-host on their own infrastructure
- Support any payment provider through a normalized, idempotent abstraction layer
- Be maintainable by AI agents through hierarchical, self-contained documentation

**Tenant breakdown (v1):**
- 7 single-vendor stores
- 3 multi-vendor marketplaces

**Explicitly deferred to v2:**
- Tax calculation (schema hooks present)
- Automated vendor payouts and commission splits (schema hooks present)
- Return / refund workflow (schema hooks present)
- Multi-currency checkout
- Carrier-based shipping rates (flat rate only in v1)

---

## 2. Core Design Principles

Every technical decision must be validated against these. Non-negotiable.

| # | Principle | Implementation |
|---|-----------|----------------|
| P1 | **Portable by design** | No hard dependency on any cloud provider. Runs on VPS, Docker, managed cloud identically. |
| P2 | **Layers are plug-and-play** | Tenancy layer, Core engine, Vendor layer are independently removable. Remove tenancy = single-store. Remove vendor = single-vendor. |
| P3 | **Tenant isolation via RLS** | Row-Level Security on every table. Cross-tenant leakage is architecturally impossible at DB layer. |
| P4 | **All external concerns abstracted** | `PaymentProvider`, `NotificationProvider`, `StorageProvider`, `SearchProvider` — swap any dependency by changing one file. |
| P5 | **Schema hooks for deferred features** | Columns/tables for tax, returns, payouts are present from day one with null values. Pricing pipeline never changes when activated. |
| P6 | **Append-only ledgers for money** | `loyalty_ledger` and `payment_events` are append-only. Balance always computed, never stored mutable. |
| P7 | **Idempotent everything** | Payment webhooks, job processing, all external callbacks are idempotent. Duplicate delivery is always safe. |
| P8 | **Price snapshots on orders** | Order items store full snapshot. Never join catalog for order pricing. Ever. |
| P9 | **AI-agent maintainable** | Every module has its own self-contained PRD, Design doc, Task list. Agent fixes bugs in one module without reading others. |
| P10 | **Scalable by default** | Tenant-prefixed storage paths, tenant-aware queue names, connection pooling — all enforced from day one, not added later. |

---

## 3. System Architecture

### 3.1 High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENTS / BROWSERS                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│            STOREFRONT  (Next.js — see STOREFRONT-PRD.md)      │
│     One app, tenant-aware middleware, ISR for catalog          │
└──────────────────────┬───────────────────────────────────────┘
                       │  REST API
┌──────────────────────▼───────────────────────────────────────┐
│                   API SERVER  (Hono / Node.js)                │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │             MULTI-TENANCY LAYER                     │     │
│  │  Resolve domain → tenant_id                         │     │
│  │  Inject RLS session variable                        │     │
│  │  Load feature flags + branding config               │     │
│  └────────────────────┬────────────────────────────────┘     │
│                       │                                       │
│  ┌────────────────────▼────────────────────────────────┐     │
│  │                 CORE ENGINE                         │     │
│  │  Auth · Catalog · Inventory · Cart · Orders         │     │
│  │  Payments (provider-agnostic) · Shipping            │     │
│  │  Discounts · Notifications · Loyalty                │     │
│  │  Cart Abandonment · Reviews · Search                │     │
│  └────────────────────┬────────────────────────────────┘     │
│                       │                                       │
│  ┌────────────────────▼────────────────────────────────┐     │
│  │              VENDOR LAYER  (optional)               │     │
│  │  Vendor profiles · Vendor catalog scoping           │     │
│  │  Order splitting · Vendor admin · Sales ledger      │     │
│  └─────────────────────────────────────────────────────┘     │
└──────┬──────────────────────────────────────┬────────────────┘
       │                                      │
┌──────▼──────────┐                  ┌────────▼───────────────┐
│  PostgreSQL      │                  │  BullMQ Workers        │
│  (Supabase /     │                  │  (same Railway service │
│   self-hosted)   │                  │   or separate)         │
│  + PgBouncer     │                  └────────┬───────────────┘
└─────────────────┘                           │
                                     ┌────────▼───────────────┐
┌─────────────────┐                  │  Upstash / Redis        │
│  Cloudflare R2   │                  └────────────────────────┘
│  (S3-compatible) │
└─────────────────┘       ┌──────────────────┐  ┌────────────────┐
                          │  Typesense        │  │  Resend / SMTP │
                          │  (self-hosted)    │  │  (abstracted)  │
                          └──────────────────┘  └────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Portable Alternative | Why |
|-------|-----------|----------------------|-----|
| API Server | Hono on Node.js | Any Node.js host | Lightweight, edge-deployable |
| Database | PostgreSQL via Supabase | Self-hosted PostgreSQL | RLS, battle-tested |
| ORM | Drizzle ORM | — | Type-safe, raw SQL output, no magic |
| Validation | Zod | — | Every API boundary |
| Queue | BullMQ + Upstash Redis | BullMQ + self-hosted Redis | Retry, DLQ, scheduling |
| Storage | Cloudflare R2 | MinIO, AWS S3 (any S3-compat) | Free egress |
| Auth | Supabase Auth (GoTrue) | Self-hosted GoTrue | Same API, portable |
| Payments | Razorpay (v1) | Stripe, PayU, PhonePe, any | Via PaymentProvider interface |
| Email | Resend (v1) | SMTP, SendGrid, any | Via NotificationProvider interface |
| Search | Typesense (self-hosted) | — | Binary, runs anywhere |
| Admin | Payload CMS | — | Wired to existing Postgres |
| Storefront | Next.js | — | ISR, single app all tenants |

### 3.3 Module Directory Structure

```
src/
├── layers/
│   ├── tenancy/              ← Multi-tenancy middleware and resolution
│   └── vendor/               ← Vendor layer (removable)
├── modules/
│   └── {module-name}/
│       ├── {module}.service.ts       — business logic only
│       ├── {module}.repository.ts    — all DB queries, no logic
│       ├── {module}.routes.ts        — thin: validate → service → respond
│       ├── {module}.schema.ts        — Drizzle table defs (schema source of truth)
│       ├── {module}.types.ts         — TypeScript interfaces + enums
│       ├── {module}.validators.ts    — Zod schemas
│       └── {module}.test.ts          — unit tests on service layer
├── providers/
│   ├── payment/
│   │   ├── payment.interface.ts      ← PaymentProvider interface
│   │   ├── razorpay.provider.ts      ← Razorpay implementation
│   │   ├── stripe.provider.ts        ← Stripe implementation (add later)
│   │   └── payment.factory.ts        ← resolves provider from tenant config
│   ├── notification/
│   │   ├── notification.interface.ts
│   │   ├── resend.provider.ts
│   │   └── smtp.provider.ts
│   ├── storage/
│   │   ├── storage.interface.ts
│   │   └── s3.provider.ts            ← works for R2, MinIO, AWS S3
│   └── search/
│       ├── search.interface.ts
│       └── typesense.provider.ts
├── lib/
│   ├── pricing.ts            ← order total pipeline
│   ├── idempotency.ts        ← idempotency key management
│   ├── queue.ts              ← BullMQ setup, tenant-aware queue names
│   └── db.ts                 ← Drizzle client + PgBouncer config
└── middleware/
    ├── tenant.middleware.ts   ← resolves tenant, injects context, sets RLS
    ├── auth.middleware.ts     ← validates JWT
    └── ratelimit.middleware.ts
```

### 3.4 Pricing Pipeline

Wired from day one. Deferred modules return zero/passthrough until implemented.

```typescript
// src/lib/pricing.ts

async function calculateOrderTotal(
  cart: Cart,
  tenant: TenantContext
): Promise<OrderTotal> {
  const subtotal = calculateSubtotal(cart.items)
  const discount = await discountModule.apply(subtotal, cart, tenant)  // coupons + loyalty
  const shipping = await shippingModule.calculate(cart.items, cart.address, tenant)
  const tax      = await taxModule.calculate(cart.items, tenant)       // returns 0 in v1
  const total    = subtotal - discount + shipping + tax

  return { subtotal, discount, shipping, tax, total }
}
```

---

## 4. Layer Architecture — Plug-and-Play

### 4.1 The Three Layers

```
┌──────────────────────────────────────────────┐
│           MULTI-TENANCY LAYER                │  Remove → single-store engine
│  - Tenant resolution middleware              │
│  - RLS context injection                     │
│  - Domain/subdomain routing                  │
│  - Per-tenant feature flags                  │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│              CORE ENGINE                     │  This is the product
│  Auth · Catalog · Inventory · Cart           │
│  Orders · Payments · Shipping                │
│  Discounts · Notifications · Loyalty         │
│  Cart Abandonment · Reviews · Search         │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│             VENDOR LAYER                     │  Remove → single-vendor only
│  Vendor profiles · Onboarding                │
│  Vendor-scoped catalog                       │
│  Order splitting into sub-orders             │
│  Vendor admin · Sales ledger                 │
└──────────────────────────────────────────────┘
```

### 4.2 Layer Interface Contracts

**Tenancy → Core Engine:**
```typescript
// Injected by tenant middleware into every request context
interface TenantContext {
  tenantId: string
  mode: 'SINGLE_VENDOR' | 'MULTI_VENDOR'
  features: {
    wishlist: boolean
    loyalty: boolean
    reviews: boolean
    cart_abandonment: boolean
  }
  config: {
    currency: string
    timezone: string
    earn_rate: number         // loyalty points per ₹1
    redeem_rate: number       // ₹1 per N points
    shipping_flat_rate: number
    free_shipping_threshold: number | null
    cart_abandonment_delay_hours: number
    coupon_loyalty_stacking: boolean
    return_window_days: number
  }
  payment: {
    provider: 'razorpay' | 'stripe' | 'payu'
    credentials: Record<string, string>  // fetched from secrets store, never logged
  }
}
// Core engine reads from ctx.tenant — never resolves tenant itself
```

**Core → Vendor Layer (event-based):**
```typescript
// Vendor layer hooks via an event emitted after order_items are created
interface OrderCreatedEvent {
  orderId: string
  tenantId: string
  items: Array<{ variantId: string; vendorId: string; quantity: number; lineTotal: number }>
}
// Vendor layer subscribes → creates order_sub_orders
// If vendor layer removed, event is emitted to nothing — core unchanged
```

### 4.3 How to Remove a Layer

**Remove Multi-Tenancy (single-store):**
- Delete `src/layers/tenancy/`
- Replace middleware with: `ctx.tenant = { tenantId: 'default', ...hardcodedConfig }`
- Zero changes to any module

**Remove Vendor Layer:**
- Delete `src/layers/vendor/`
- `OrderCreatedEvent` still emits, no subscriber
- Remove `vendor_id` FK enforcement from Catalog (column stays, just nullable)
- Zero changes to any module

---

## 5. Scalability — 10 to 100+ Stores

This section defines decisions that **must be made at day one** to avoid painful migrations later.

### 5.1 What Changes Between 10 and 100 Stores

| Concern | 10 Stores | 100 Stores | Action Required Now |
|---------|-----------|------------|---------------------|
| DB connections | Supabase Pro (500 conn) | Need PgBouncer pooling | Use pooled connection URL from day 1 |
| BullMQ queues | Shared queues work | Need tenant-isolated queues | Tenant-prefixed queue names from day 1 |
| Storage paths | Any structure | Need tenant isolation | `/{tenantId}/` prefix from day 1 |
| Typesense | Shared service OK | Needs dedicated service at ~30 tenants | Plan the upgrade path |
| Redis | Upstash free tier | May hit limits | Key prefix strategy from day 1 |
| API server | Single Railway service | Horizontal scaling | Stateless from day 1 |
| Search sync jobs | Per-product BullMQ jobs | May queue up | Worker concurrency config |

### 5.2 Database — Scalability Rules

**Rule: Always use the PgBouncer pooled connection string.**
```bash
# Wrong — direct connection, hits limit fast
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres

# Correct — PgBouncer pooled, required from day 1
DATABASE_URL=postgresql://user:pass@db.supabase.co:6543/postgres?pgbouncer=true
```

**Rule: Every tenant-scoped table has an index on `(tenant_id, ...)`.**
```sql
-- Not just tenant_id alone — always composite with query patterns
CREATE INDEX idx_products_tenant_status ON products(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_tenant_customer ON orders(tenant_id, customer_id);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
```

**Rule: RLS policies must use `current_setting()` not `auth.uid()`.**
```sql
-- Correct — works with any auth system, not Supabase-specific
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### 5.3 Queue — Scalability Rules

**Rule: All BullMQ queue names are tenant-prefixed.**
```typescript
// src/lib/queue.ts

// Wrong — global queue mixes all tenants
const cartAbandonmentQueue = new Queue('cart-abandonment')

// Correct — tenant-isolated, can be monitored and throttled per tenant
const cartAbandonmentQueue = new Queue(`tenant:${tenantId}:cart-abandonment`)
```

**Rule: Worker concurrency is configurable per queue type.**
```typescript
const worker = new Worker(queueName, processor, {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5'),
  limiter: { max: 10, duration: 1000 }  // rate limit per second
})
```

**Rule: Dead Letter Queue (DLQ) on every queue.**
```typescript
const queue = new Queue(queueName, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: false  // keep failed jobs in DLQ for inspection
  }
})
```

### 5.4 Storage — Scalability Rules

**Rule: All R2/S3 paths are tenant-prefixed from day one.**
```
/{tenantId}/products/{productId}/{filename}.webp
/{tenantId}/vendors/{vendorId}/{filename}.webp
/{tenantId}/exports/{exportId}/data.zip
```

**Rule: StorageProvider always receives tenantId.**
```typescript
interface StorageProvider {
  upload(tenantId: string, path: string, file: Buffer, contentType: string): Promise<string>
  delete(tenantId: string, path: string): Promise<void>
  getSignedUrl(tenantId: string, path: string, expiresIn: number): Promise<string>
}
// Implementation prepends tenantId to path internally
```

### 5.5 Redis — Scalability Rules

**Rule: All Redis keys are tenant-prefixed.**
```typescript
// Cart cache
`tenant:${tenantId}:cart:${cartId}`

// Rate limiting
`ratelimit:tenant:${tenantId}:ip:${ip}:${endpoint}`

// Idempotency keys
`idempotency:tenant:${tenantId}:${key}`

// Product & Category Cache
`tenant:${tenantId}:product:${productId_or_slug}`
`tenant:${tenantId}:category:${categoryId_or_slug}`
`tenant:${tenantId}:catalog:list:${query_params_hash}`
```

### 5.6 Typesense — Upgrade Path

| Scale | Setup | Action |
|-------|-------|--------|
| 1–30 tenants | Shared Typesense on Railway (single node) | Nothing |
| 30–100 tenants | Dedicated Railway service, more RAM | Move Typesense to its own service |
| 100+ tenants | Typesense Cloud or self-hosted cluster | Migrate connection string |

Tenant isolation is enforced via separate collections (`products_{tenantId}`) — this approach works at any scale.

### 5.7 API Server — Scalability Rules

**Rule: API server is fully stateless.**
- No in-memory state
- No local file system reads
- Session state in Redis only
- All config from environment variables or DB

**Rule: Railway horizontal scaling is a one-click operation because of the above.**

---

## 6. Portability — Self-Hosting

### 6.1 What Store Owners Receive

```
nexus-engine/
├── docker-compose.yml      ← Postgres, Redis, Typesense, API, Workers
├── docker-compose.dev.yml  ← adds hot reload, local R2 via MinIO
├── .env.example            ← all env vars documented with descriptions
├── Dockerfile              ← production image
├── scripts/
│   ├── setup.sh            ← first-time: migrate, seed, create admin
│   ├── migrate.sh          ← run pending migrations
│   ├── export-data.sh      ← export tenant data to JSON/CSV
│   └── import-data.sh      ← import data to a fresh instance
├── drizzle/
│   └── migrations/         ← all DB migrations, run with drizzle-kit
├── src/                    ← full engine source
└── SELF-HOSTING.md         ← step-by-step guide
```

### 6.2 Portability Rules (enforced in code review)

- No hardcoded cloud provider URLs — all via env vars
- No Supabase SDK in core engine — standard `pg` / Drizzle only
- No Upstash SDK — standard `ioredis` only
- Storage always via `StorageProvider` interface
- Email always via `NotificationProvider` interface
- Payments always via `PaymentProvider` interface — never call Razorpay SDK directly from modules
- All migrations in `drizzle/migrations/` — no Supabase-specific migration tooling

### 6.3 Full Environment Variables Reference

```bash
# ── Database ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_POOL_URL=postgresql://user:pass@host:6543/dbname?pgbouncer=true

# ── Auth (Supabase Auth / GoTrue — same API) ─────────────────────
AUTH_URL=https://xxx.supabase.co/auth/v1
AUTH_ANON_KEY=xxx
AUTH_SERVICE_KEY=xxx

# ── Redis ────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Storage (S3-compatible — R2, MinIO, AWS S3) ──────────────────
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=xxx
STORAGE_SECRET_KEY=xxx
STORAGE_BUCKET=nexus-media
STORAGE_PUBLIC_URL=https://media.yourdomain.com

# ── Search ───────────────────────────────────────────────────────
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=xxx
TYPESENSE_PROTOCOL=http   # https in production

# ── Email (Resend / SMTP) ────────────────────────────────────────
NOTIFICATION_PROVIDER=resend            # or: smtp
RESEND_API_KEY=xxx
SMTP_HOST=smtp.example.com              # if using smtp
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx

# ── Payments (configured per-tenant in DB, not global env) ───────
# Global fallback only — tenant payment config overrides this
DEFAULT_PAYMENT_PROVIDER=razorpay

# ── App ──────────────────────────────────────────────────────────
APP_ENV=production
APP_SECRET=xxx                          # JWT signing key
SUPER_ADMIN_EMAIL=xxx

# ── Workers ──────────────────────────────────────────────────────
WORKER_CONCURRENCY=5
WORKER_QUEUES=cart-abandonment,search-sync,notifications,exports
```

---

## 7. Data Integrity Rules

These are absolute. Every module must follow them. AI agents must verify compliance before marking any task complete.

| Rule | What | How |
|------|------|-----|
| **R1 Price Snapshot** | Order items store price, title, SKU, variant title at purchase time. Never join catalog for pricing. | `order_items`: `unit_price_snapshot, product_title_snapshot, variant_title_snapshot, sku_snapshot` |
| **R2 Address Snapshot** | Orders copy full address as JSONB — not FK. Addresses change; order history must not. | `orders.shipping_address_snapshot JSONB NOT NULL` |
| **R3 Soft Deletes** | Products, variants, customers, vendors: `deleted_at`. Hard delete never on entities referenced by orders. | `deleted_at TIMESTAMPTZ` on all such tables |
| **R4 Append-Only Ledgers** | `loyalty_ledger` and `payment_events` are append-only. No UPDATE or DELETE. Balance = SUM(delta). | DB triggers reject UPDATE/DELETE on these tables |
| **R5 Inventory Concurrency** | All inventory mutations use `SELECT FOR UPDATE` inside a transaction. | All inventory ops go through `inventory.repository.ts` only — never bypassed |
| **R6 Idempotent Webhooks** | `payment_events` has `UNIQUE(provider_event_id)`. Insert on duplicate = no-op. | `ON CONFLICT(provider_event_id) DO NOTHING` |
| **R7 Atomic Order Creation** | Entire order placement in one PostgreSQL transaction. Any failure = full rollback. | `orders.service.ts::placeOrder()` wraps in `db.transaction()` |
| **R8 Human Order Numbers** | Customer-facing order numbers are sequential per tenant (`ORD-0001`), not UUIDs. | `order_number_seq_{tenantId}` Postgres sequence |
| **R9 Tenant Isolation** | Every query on tenant-scoped table includes `tenant_id`. RLS enforces at DB layer. | Drizzle always receives `tenantId` from request context |
| **R10 Schema Hooks** | Deferred features have columns present with null values. Logic added later, columns never migrated in. | See each module's Schema Hooks section |
| **R11 Tenant-Prefixed Resources** | Storage paths, queue names, Redis keys, Typesense collections all prefixed with `tenantId`. | Enforced in `StorageProvider`, `queue.ts`, Redis key helpers |

---

## 8. Payment Layer — Provider-Agnostic Spec

This section fully specifies the payment abstraction layer. Any module that touches payments must read this section entirely.

### 8.1 Why This Matters

Payment providers differ in: webhook payload shapes, signature verification methods, refund APIs, error codes, retry behavior, and idempotency key support. The abstraction layer normalizes all of this so that:

- Modules only interact with `PaymentService` — never with `RazorpayProvider` directly
- Adding a new payment provider (Stripe, PayU, PhonePe) requires zero changes to any module
- Idempotency, failure handling, and retry logic are in one place

### 8.2 PaymentProvider Interface

```typescript
// src/providers/payment/payment.interface.ts

export interface CreateOrderParams {
  amount: number          // in smallest currency unit (paise for INR, cents for USD)
  currency: string        // ISO 4217: 'INR', 'USD'
  orderId: string         // your internal order ID — used as receipt/reference
  tenantId: string
  metadata: Record<string, string>
}

export interface ProviderOrder {
  providerOrderId: string   // provider's order/session ID (returned to frontend)
  providerOrderToken: string // token/key frontend uses to open payment modal
  amount: number
  currency: string
  status: 'created' | 'attempted' | 'paid'
}

export interface WebhookEvent {
  providerEventId: string   // globally unique event ID from provider
  type: NormalizedEventType
  paymentId: string         // provider's payment ID
  orderId: string           // your internal order ID (from metadata)
  amount: number
  currency: string
  status: 'paid' | 'failed' | 'refunded'
  rawPayload: object        // original payload, stored for debugging
}

export type NormalizedEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.partially_refunded'

export interface RefundParams {
  paymentId: string         // provider's payment ID
  amount: number            // partial refund supported
  reason: string
  idempotencyKey: string    // caller provides, provider uses if supported
}

export interface RefundResult {
  providerRefundId: string
  status: 'pending' | 'processed' | 'failed'
  amount: number
}

export interface PaymentProvider {
  // Creates a payment session/order with the provider
  createOrder(params: CreateOrderParams): Promise<ProviderOrder>

  // Verifies webhook signature — throws if invalid
  verifyWebhook(rawBody: string, signature: string, secret: string): void

  // Normalizes provider-specific webhook payload into a standard shape
  parseWebhook(rawPayload: object): WebhookEvent

  // Initiates a refund — idempotent via idempotencyKey
  initiateRefund(params: RefundParams): Promise<RefundResult>

  // Health check — used by startup probe
  healthCheck(): Promise<boolean>
}
```

### 8.3 PaymentFactory — Provider Resolution

```typescript
// src/providers/payment/payment.factory.ts

export function resolvePaymentProvider(tenant: TenantContext): PaymentProvider {
  switch (tenant.payment.provider) {
    case 'razorpay': return new RazorpayProvider(tenant.payment.credentials)
    case 'stripe':   return new StripeProvider(tenant.payment.credentials)
    case 'payu':     return new PayUProvider(tenant.payment.credentials)
    default: throw new Error(`Unknown payment provider: ${tenant.payment.provider}`)
  }
}
// Credentials are fetched from encrypted DB column — never hardcoded, never logged
```

### 8.4 PaymentService — The Only Interface Modules Use

```typescript
// src/modules/payments/payment.service.ts

class PaymentService {
  // Called during checkout — creates provider order, stores payment_intent
  async initiatePayment(orderId: string, tenant: TenantContext): Promise<{
    providerOrderId: string
    providerOrderToken: string
  }>

  // Called by webhook handler — idempotent, safe to call multiple times
  async handleWebhook(rawBody: string, signature: string, tenant: TenantContext): Promise<void>

  // Called by admin — manual refund trigger
  async initiateRefund(paymentIntentId: string, amount: number, tenant: TenantContext): Promise<void>

  // Called by order service during placement — creates the payment_intent record
  async createPaymentIntent(orderId: string, amount: number, tenant: TenantContext): Promise<string>
}
```

### 8.5 Webhook Processing — Full Flow

```
Provider sends webhook
        │
        ▼
POST /webhooks/{provider}/{tenantId}
        │
        ▼
1. Resolve tenant from tenantId param
        │
        ▼
2. Verify signature (provider.verifyWebhook)
   → 401 if invalid, log attempt
        │
        ▼
3. Parse raw payload → NormalizedWebhookEvent (provider.parseWebhook)
        │
        ▼
4. Check idempotency:
   INSERT INTO payment_events (provider_event_id, ...)
   ON CONFLICT (provider_event_id) DO NOTHING
   → if 0 rows inserted: return 200 immediately (already processed)
        │
        ▼
5. Begin DB transaction:
   a. Update payment_intent status
   b. If 'payment.captured':
      - Update order status: PENDING → CONFIRMED
      - Enqueue notification job: order.confirmed
      - Award loyalty points (if feature enabled) — enqueued as job, not inline
   c. If 'payment.failed':
      - Update payment_intent status: FAILED
      - Order stays PENDING (customer can retry)
   d. If 'payment.refunded':
      - Update payment_intent status: REFUNDED
      - Update order status: CANCELLED (if full refund)
        │
        ▼
6. Return 200 to provider (must return fast — provider will retry if slow)
```

### 8.6 Idempotency — Full Spec

**Webhook idempotency** (covered above via `payment_events` unique constraint).

**API idempotency** — for client-initiated requests that must not double-execute:

```typescript
// Client sends: Idempotency-Key: {uuid} header on POST requests
// Server checks Redis before processing:

async function withIdempotency<T>(
  key: string,
  tenantId: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const redisKey = `idempotency:tenant:${tenantId}:${key}`
  const cached = await redis.get(redisKey)

  if (cached) return JSON.parse(cached)  // return cached result

  const result = await fn()
  await redis.setex(redisKey, ttlSeconds, JSON.stringify(result))
  return result
}

// Used on: POST /orders, POST /payments/initiate, POST /refunds
```

### 8.7 Payment Failure Handling

| Scenario | Behavior |
|----------|----------|
| Payment failed (user declined / insufficient funds) | Order stays `PENDING`. Payment intent status → `FAILED`. Customer shown retry button. |
| Payment succeeded but webhook delayed | Order stays `PENDING` until webhook arrives. Idempotency ensures no double-processing when it does. |
| Webhook arrives but DB transaction fails | Payment event not inserted (transaction rolled back). Provider retries. Idempotency handles. |
| Provider sends duplicate webhook | `ON CONFLICT DO NOTHING` on `payment_events`. 200 returned immediately. No double-processing. |
| Payment succeeded but network error returning 200 | Provider retries. Idempotency handles. Safe. |
| Cart expired before payment completes | On `payment.captured` for an order whose cart is cleared: order proceeds normally. Cart state is irrelevant post-order-creation. |
| Partial capture (provider quirk) | Stored as `payment.partially_captured` in raw payload. Alert raised. Manual review required in v1. |

### 8.8 Adding a New Payment Provider (e.g. Stripe)

Steps to add Stripe with zero changes to any module:

1. Create `src/providers/payment/stripe.provider.ts` implementing `PaymentProvider`
2. Add `case 'stripe'` to `payment.factory.ts`
3. Add Stripe credentials columns to `tenant_payment_config` table (already has `provider VARCHAR` + `credentials JSONB`)
4. Done. No module changes.

### 8.9 Payment Tables Schema

```sql
-- Stores one record per payment attempt
CREATE TABLE payment_intents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  order_id              UUID NOT NULL REFERENCES orders(id),
  provider              VARCHAR NOT NULL,          -- 'razorpay', 'stripe', etc.
  provider_order_id     VARCHAR NOT NULL,          -- provider's order/session ID
  amount                INTEGER NOT NULL,          -- in smallest unit (paise)
  currency              VARCHAR(3) NOT NULL,
  status                VARCHAR NOT NULL DEFAULT 'PENDING',
                        -- PENDING | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED
  payment_method_type   VARCHAR,                   -- 'card', 'upi', 'netbanking'
  payment_method_last4  VARCHAR(4),               -- card last 4 digits
  payment_method_label  VARCHAR,                   -- display: "HDFC Visa ••••4242"
  refund_amount         INTEGER DEFAULT 0,
  refunded_at           TIMESTAMPTZ,
  automated_refund_triggered_at TIMESTAMPTZ,      -- schema hook, null in v1
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only log of every provider event received
CREATE TABLE payment_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  payment_intent_id     UUID REFERENCES payment_intents(id),
  provider_event_id     VARCHAR NOT NULL,          -- provider's unique event ID
  event_type            VARCHAR NOT NULL,          -- normalized: 'payment.captured'
  raw_payload           JSONB NOT NULL,            -- full provider payload for debugging
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_provider_event UNIQUE (provider_event_id)  -- idempotency
);

-- Per-tenant payment provider config (allows different providers per tenant)
CREATE TABLE tenant_payment_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  provider              VARCHAR NOT NULL DEFAULT 'razorpay',
  credentials           JSONB NOT NULL,            -- encrypted at rest
  webhook_secret        VARCHAR NOT NULL,           -- encrypted at rest
  is_test_mode          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 9. Core Data Model

### 9.1 Entity Relationship Map

```
tenants
  ├── tenant_payment_config
  ├── shipping_zones
  ├── coupons → coupon_usages
  └── notification_templates

vendors (multi-vendor only)
  └── vendor_members → customers

products
  ├── product_images
  ├── product_categories ↔ categories
  ├── reviews
  └── variants
        └── inventory

customers (tenant-scoped)
  ├── addresses
  ├── carts → cart_items → variants
  ├── orders
  │     ├── order_items (price snapshot)
  │     ├── order_sub_orders → vendors (multi-vendor)
  │     └── payment_intents → payment_events (append-only)
  └── loyalty_ledger (append-only)

carts → abandoned_cart_events
products → price_history (append-only)
inventory → inventory_history (append-only)
```

### 9.2 Shared Column Conventions

```sql
-- Every table
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- Every tenant-scoped table (all tables except tenants itself)
tenant_id   UUID NOT NULL REFERENCES tenants(id)

-- Soft-deletable entities (products, variants, customers, vendors)
deleted_at  TIMESTAMPTZ
```

---

## 10. Module Index

### Build Priority Table

| ID | Module | Layer | Phase | Days | Blocks |
|----|--------|-------|-------|------|--------|
| M01 | Tenant Management | Tenancy | 1 | 1 | Everything |
| M02 | Auth & Customers | Core | 1 | 2 | M06, M07 |
| M03 | Catalog | Core | 1 | 3 | M04, M06, M07 |
| M04 | Inventory | Core | 1 | 1 | M06, M07 |
| M05 | Shipping | Core | 1 | 1 | M06, M07 |
| M06 | Cart | Core | 1 | 2 | M07 |
| M07 | Orders | Core | 1 | 3 | M08 |
| M08 | Payments | Core | 1 | 2 | — |
| M09 | Discounts & Coupons | Core | 2 | 1.5 | — |
| M10 | Notifications | Core | 2 | 1 | — |
| M11 | Cart Abandonment | Core | 2 | 1 | M10 |
| M12 | Loyalty | Core | 2 | 1.5 | M10 |
| M13 | Reviews | Core | 2 | 1.5 | — |
| M14 | Vendors | Vendor | 3 | 2 | M03, M07 |
| M15 | Search | Core | 3 | 1.5 | M03 |
| M16 | Admin (Payload CMS) | Core | 3 | 3 | All |

### Cross-Module Dependency Map

```
M01 ← required by ALL modules (tenant context)
M02 ← required by M06 (cart auth), M07 (order customer), M12 (loyalty customer)
M03 ← required by M04 (inventory), M06 (cart items), M07 (order items), M15 (search index)
M04 ← required by M06 (reserve on add), M07 (decrement on order)
M05 ← required by M06 (shipping in total), M07 (shipping snapshot)
M06 ← required by M07 (place order from cart), M11 (abandonment watches carts)
M07 ← required by M08 (payment tied to order), M09 (coupon usage logged), M10 (events trigger emails), M12 (loyalty earn on delivery)
M08 ← required by M07 (webhook updates order status)
M09 ← required by M06 (apply coupon to cart), M07 (log usage on order)
M10 ← required by M07 (order emails), M08 (payment emails), M11 (abandonment email), M12 (loyalty emails)
M14 ← required by M03 (vendor_id on products), M07 (sub-order splitting)
```

---

## 11. Module Specifications

> For AI agents: each module section specifies v1 scope and schema hooks only. Full API contracts, DDL, and sequence diagrams are in the corresponding `DESIGN-MXX.md` file.

---

### M01 — Tenant Management

**Layer:** Tenancy | **Phase:** 1 | **Estimate:** 1 day
**Docs:** `PRD-M01.md` · `DESIGN-M01.md` · `TASKS-M01.md`
**Cross-module:** Provides `TenantContext` to all modules. Has no dependencies.

**V1 Features:**
- Create and manage tenants: name, slug, custom domain, currency (INR default), timezone
- Tenant mode: `SINGLE_VENDOR` | `MULTI_VENDOR`
- Feature flags JSONB: `{ wishlist, loyalty, reviews, cart_abandonment }`
- Tenant status: `onboarding` | `active` | `suspended`
- Branding config JSONB: `{ primary_color, secondary_color, logo_url, favicon_url, font }`
- Domain resolution: `slug.nexuscommerce.app` or custom domain → `tenant_id`
- Resend sender config per tenant: `from_name, from_email`
- Payment provider config per tenant (stored in `tenant_payment_config`)
- Tenant config (stored in `tenant_config`): shipping rates, loyalty rates, cart abandonment delay, return window

**Schema Hooks:**
- `tax_config JSONB` — GST/VAT rates, registration numbers
- `payout_config JSONB` — platform bank details for payouts
- `billing_plan_id UUID` — for your subscription billing to the tenant
- `trial_ends_at TIMESTAMPTZ`

---

### M02 — Auth & Customers

**Layer:** Core | **Phase:** 1 | **Estimate:** 2 days
**Docs:** `PRD-M02.md` · `DESIGN-M02.md` · `TASKS-M02.md`
**Cross-module:** Provides customer identity to M06, M07, M12.

**V1 Features:**
- Email + password registration and login (bcrypt min 12 rounds)
- Google OAuth via Supabase Auth
- JWT access tokens (15min TTL) + refresh tokens (30-day, httpOnly cookie)
- Guest sessions: UUID-based, in DB, linked to cart
- Cart merge on login: guest cart → customer cart
- Profile: name, email, phone, avatar_url
- Address book: multiple per customer, default shipping + billing flags
- Password reset via email OTP
- Email verification on signup
- Tenant-scoped: same email independent across tenants
- Soft delete: `deleted_at`

**Address fields:** `line1, line2, city, state, postal_code, country, phone, label, is_default_shipping, is_default_billing`

**Schema Hooks:**
- `gdpr_deletion_requested_at TIMESTAMPTZ`
- `coordinates POINT` — delivery distance
- `tier_id FK` — loyalty tier (Silver/Gold/Platinum), null in v1

---

### M03 — Catalog

**Layer:** Core | **Phase:** 1 | **Estimate:** 3 days
**Docs:** `PRD-M03.md` · `DESIGN-M03.md` · `TASKS-M03.md`
**Cross-module:** Provides products/variants to M04, M06, M07, M15.

**V1 Features — Products:**
- `title, slug (unique/tenant), description (HTML), short_description`
- `status: draft | active | archived`
- `product_type: physical | digital`
- SEO: `meta_title, meta_description, canonical_url`
- JSON-LD Product schema auto-generated
- Soft delete — archived products still visible on historical orders
- `vendor_id FK` on every product (for multi-vendor tenants)
- **Redis Caching:** Cache product details by slug/ID with TTL (e.g., 1 hour), invalidated on update

**V1 Features — Variants:**
- Every purchasable unit is a variant; single-option products have one default
- `sku (unique/tenant), title, price, compare_at_price, position, is_default`
- `attributes JSONB: { "size": "L", "color": "Blue" }`
- Variant-level images

**V1 Features — Categories:** nested tree via `parent_id`, max depth 3, `name, slug, description, image_url, position, is_active`.
- **Redis Caching:** Cache category tree and individual category metadata; invalidated on any category change.

**V1 Features — Images:** R2 upload, `url, alt_text, position`. Serve via Cloudflare Images CDN.

**Schema Hooks:**
- `tax_class ENUM (standard|reduced|exempt|digital)` — null in v1
- `weight_grams, length_mm, width_mm, height_mm` on variants — null in v1
- `price_history` table (append-only): `variant_id, old_price, new_price, changed_at, changed_by`
- `vendor_commission_override DECIMAL` — null in v1

---

### M04 — Inventory

**Layer:** Core | **Phase:** 1 | **Estimate:** 1 day
**Docs:** `PRD-M04.md` · `DESIGN-M04.md` · `TASKS-M04.md`
**Cross-module:** Called by M06 (reserve), M07 (decrement). No other module bypasses this.

**V1 Features:**
- `quantity_available, quantity_reserved, quantity_sold` per variant
- `allow_backorder BOOLEAN` per variant
- `low_stock_threshold INTEGER` — informational only
- Reservation on cart add (15-min TTL via BullMQ job)
- Release on: item removed, cart expired, BullMQ TTL fires
- Permanent decrement in order placement transaction (Rule R7)
- Restore on cancellation
- All mutations: `SELECT FOR UPDATE` (Rule R5)

**Schema Hooks:**
- `location_id FK` — null in v1, warehouse-level inventory
- `inventory_history` table (append-only): `variant_id, delta, reason, order_id, changed_at`

---

### M05 — Shipping

**Layer:** Core | **Phase:** 1 | **Estimate:** 1 day
**Docs:** `PRD-M05.md` · `DESIGN-M05.md` · `TASKS-M05.md`
**Cross-module:** Called by pricing pipeline in M06 and M07.

**V1 Features:**
- Flat-rate per tenant, free shipping threshold (optional)
- Single domestic zone
- Returns: `{ label, description, estimated_days, amount }`
- `shippingModule.calculate(items, address, tenant)` — only public interface

**Schema Hooks:**
- `shipping_zones` table: full structure present, one default zone only in v1
- `carrier_id` on orders — null in v1 (Shiprocket/Delhivery later)
- `tracking_number, tracking_url` on `order_sub_orders` — null in v1

---

### M06 — Cart

**Layer:** Core | **Phase:** 1 | **Estimate:** 2 days
**Docs:** `PRD-M06.md` · `DESIGN-M06.md` · `TASKS-M06.md`
**Cross-module:** Depends on M02 (auth), M03 (variants), M04 (inventory), M05 (shipping), M09 (discounts).

**V1 Features:**
- Guest and authenticated carts
- Add, update quantity, remove items
- Item: `variant_id, quantity, unit_price (snapshot at add), line_total`
- Price re-validation on checkout (show notice if changed)
- Merge guest cart on login
- Apply coupon (M09), apply loyalty points (M12)
- Stacking rule: coupon OR points — not both (tenant config)
- 7-day expiry via BullMQ
- Total breakdown: `subtotal, discount_amount, shipping_amount, tax_amount(0), total`
- PostgreSQL source of truth; Redis for fast reads

**Schema Hooks:**
- `saved_for_later_items` table — wishlist-adjacent

---

### M07 — Orders

**Layer:** Core | **Phase:** 1 | **Estimate:** 3 days
**Docs:** `PRD-M07.md` · `DESIGN-M07.md` · `TASKS-M07.md`
**Cross-module:** Depends on M02, M03, M04, M05, M06, M09. Required by M08, M10, M12, M14.

**V1 — Atomic Order Placement (single DB transaction):**
1. Validate cart: stock available, coupon valid, prices current
2. Lock inventory rows (`SELECT FOR UPDATE`)
3. Create `orders` record — status `PENDING`
4. Create `order_items` with full price snapshot (Rule R1)
5. If multi-vendor: emit `OrderCreatedEvent` → Vendor Layer creates `order_sub_orders`
6. Decrement inventory permanently
7. Log coupon usage
8. Deduct loyalty points if redeemed
9. Create `payment_intent` record
10. Clear cart

**Order Fields:**
- `order_number` — tenant-scoped sequential (Rule R8)
- `status: PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED`
- `customer_id FK` (null for guest orders)
- `guest_email, order_token UUID` — guest tracking
- `shipping_address_snapshot JSONB, billing_address_snapshot JSONB` (Rule R2)
- `subtotal, discount_amount, shipping_amount, tax_amount(0), total` — all snapshotted
- `coupon_code_snapshot VARCHAR` (in addition to `coupon_id FK`)

**Order Items (Rule R1 — never change these):**
- `product_id FK, variant_id FK` — reference only, not joined for pricing
- `product_title_snapshot, variant_title_snapshot, sku_snapshot, unit_price_snapshot, quantity, line_total, image_url_snapshot, vendor_id FK`

**Guest Tracking:** `GET /orders/track?token={uuid}` — no auth, returns status + items

**Schema Hooks:**
- `return_eligible_until TIMESTAMPTZ` — calculated at order creation
- `return_status ENUM` on order_items — default `NONE`
- `payout_status ENUM (PENDING|PAID)` on `order_sub_orders`

---

### M08 — Payments

**Layer:** Core | **Phase:** 1 | **Estimate:** 2 days
**Docs:** `PRD-M08.md` · `DESIGN-M08.md` · `TASKS-M08.md`
**Cross-module:** Updates order status (M07). Enqueues notification (M10). Reads tenant payment config (M01).

> **Read Section 8 (Payment Layer) in full before implementing this module.**

**V1 Features:**
- Provider: Razorpay (via `PaymentProvider` interface — see Section 8)
- Per-tenant payment provider config in `tenant_payment_config`
- `POST /webhooks/{provider}/{tenantId}` — signature verified, idempotent
- Full failure handling per Section 8.7
- Payment method snapshot stored on `payment_intents`
- Refund tracking — manual via dashboard in v1

**Providers supported in v1:** Razorpay
**Providers wired for later:** Stripe, PayU (add `StripeProvider`, `PayUProvider` classes only)

---

### M09 — Discounts & Coupons

**Layer:** Core | **Phase:** 2 | **Estimate:** 1.5 days
**Docs:** `PRD-M09.md` · `DESIGN-M09.md` · `TASKS-M09.md`
**Cross-module:** Called by M06 (apply to cart), M07 (log usage on order).

**V1 Features:**
- Types: `FIXED_AMOUNT` | `PERCENTAGE`
- `code (unique/tenant), type, value, min_order_value, max_discount_amount`
- Usage limits: `total_usage_limit, per_customer_usage_limit`
- Validity: `starts_at, expires_at`
- Scope: `ALL | SPECIFIC_PRODUCTS | SPECIFIC_CATEGORIES`
- Usage log: `coupon_usages (coupon_id, customer_id, order_id, used_at)`
- Stacking rule with loyalty enforced at cart level

**Schema Hooks:**
- `discount_type: AUTO` — automatic (no code) discounts
- `vendor_id FK` — vendor-specific coupons
- `rule_type JSONB` — BOGO/bundle rules

---

### M10 — Notifications

**Layer:** Core | **Phase:** 2 | **Estimate:** 1 day
**Docs:** `PRD-M10.md` · `DESIGN-M10.md` · `TASKS-M10.md`
**Cross-module:** Called by M07, M08, M11, M12, M14. Has no upstream dependencies.

**NotificationProvider Interface:**
```typescript
interface NotificationProvider {
  send(event: string, to: string, payload: object, fromConfig: SenderConfig): Promise<string>
  // returns provider message ID for logging
}
```

**V1 Events:**

| Event | Trigger |
|-------|---------|
| `order.confirmed` | `payment.captured` webhook |
| `order.shipped` | Sub-order → SHIPPED |
| `order.delivered` | Sub-order → DELIVERED |
| `order.cancelled` | Cancellation |
| `cart.abandoned` | Abandonment job fires |
| `auth.password_reset` | Reset initiated |
| `auth.welcome` | Registration |
| `auth.email_verify` | Signup |
| `vendor.approved` | Admin approves vendor |

**V1 Features:**
- Provider: Resend (via `NotificationProvider` interface)
- Templates in DB per event per tenant (HTML, `{{variable}}` placeholders)
- Default templates provided for all events
- Notification log: `event_type, customer_id, order_id, provider_message_id, status, sent_at`
- All sends enqueued as BullMQ jobs — never inline in request handlers

**Schema Hooks:**
- `sms_provider` on tenant config — null in v1
- `customer_notification_preferences` table — unsubscribe support

---

### M11 — Cart Abandonment

**Layer:** Core | **Phase:** 2 | **Estimate:** 1 day
**Docs:** `PRD-M11.md` · `DESIGN-M11.md` · `TASKS-M11.md`
**Cross-module:** Watches M06 (carts), triggers M10 (notifications).

**V1 Features:**
- On cart create/update: schedule BullMQ job for X hours (tenant config, default 2hr)
- Job fires: if order placed → no-op; else trigger M10 `cart.abandoned`
- Email: items, images, prices, recovery CTA
- Recovery URL: `/cart/recover?token={cart_token}`
- Cancel/reschedule on any cart activity
- Recovery detection: order placed via recovery URL → `recovered = true`
- Log: `abandoned_cart_events (cart_id, triggered_at, recovered_at, recovered BOOLEAN)`

**Schema Hooks:**
- `second_reminder_at` — 24hr follow-up
- `incentive_coupon_id` — auto-discount in email

---

### M12 — Loyalty

**Layer:** Core | **Phase:** 2 | **Estimate:** 1.5 days
**Docs:** `PRD-M12.md` · `DESIGN-M12.md` · `TASKS-M12.md`
**Cross-module:** Reads customer (M02), reads order status (M07), triggers notification (M10).

**V1 Features:**
- `loyalty_ledger` — append-only (Rule R4)
- Balance: `SUM(delta) WHERE NOT expired AND tenant_id = ?`
- Earn: on order `DELIVERED` — enqueued as BullMQ job after status update
- Redeem: applied at cart, deducted in order placement transaction
- Void: negative delta entry on order `CANCELLED`
- Expiry: per-entry `expires_at` (tenant config, e.g. 365 days)
- Customer-facing: balance + paginated ledger history

**Schema Hooks:**
- `campaign_id FK` — bonus point campaigns
- `tier_id FK` on customers — Silver/Gold/Platinum

---

### M13 — Reviews

**Layer:** Core | **Phase:** 2 | **Estimate:** 1.5 days
**Docs:** `PRD-M13.md` · `DESIGN-M13.md` · `TASKS-M13.md`
**Cross-module:** Reads orders/order_items (M07) to verify purchase. Writes to product avg_rating (M03).

**V1 Features:**
- Only customers with `DELIVERED` order containing the product can review
- `rating (1–5), title, body, reviewer_name`
- Moderation: `PENDING → APPROVED | REJECTED`
- `avg_rating` on product: updated on approve/reject (DB trigger or service)
- `helpful_count` — incremented by other customers
- Storefront: approved reviews, sorted newest / most helpful

---

### M14 — Vendors

**Layer:** Vendor Layer | **Phase:** 3 | **Estimate:** 2 days
**Docs:** `PRD-M14.md` · `DESIGN-M14.md` · `TASKS-M14.md`
**Cross-module:** Scopes M03 products. Receives M07 `OrderCreatedEvent` for sub-order creation.
**Active only when:** `tenant.mode === 'MULTI_VENDOR'`

**V1 Features:**
- Vendor profile: `name, slug, description, logo_url, banner_url, contact_email`
- Onboarding: `PENDING → VERIFIED → SUSPENDED`
- Vendor admin user: customer account linked via `vendor_members`
- Vendor-scoped catalog: all products have `vendor_id FK`
- Sales summary view: read-only, total orders + revenue (main tenant pays manually)
- Vendor admin: update sub-order status (`PROCESSING → SHIPPED`)
- Payout ledger: read-only view of vendor revenue per period

**Schema Hooks:**
- `commission_rate DECIMAL(5,2)` — null in v1
- `bank_account_details JSONB` (encrypted) — null in v1
- `return_address JSONB` — null in v1
- `payout_schedule ENUM` — null in v1

---

### M15 — Search

**Layer:** Core | **Phase:** 3 | **Estimate:** 1.5 days
**Docs:** `PRD-M15.md` · `DESIGN-M15.md` · `TASKS-M15.md`
**Cross-module:** Syncs from M03 (catalog) via BullMQ.

**V1 Features:**
- Self-hosted Typesense on Railway
- Tenant collections: `products_{tenantId}` (isolated per Rule R11)
- Indexed: `title, description, tags, categories, variant attributes, sku`
- Faceted filtering: category, price range, attributes
- Sorting: relevance, price_asc, price_desc, newest
- Sync: BullMQ job on product create/update/delete
- Multi-vendor: optional `vendor_id` filter

**Schema Hooks:**
- `search_boost_score` on products
- `search_analytics` table

---

### M16 — Admin (Payload CMS)

**Layer:** Core | **Phase:** 3 | **Estimate:** 3 days
**Docs:** `PRD-M16.md` · `DESIGN-M16.md` · `TASKS-M16.md`
**Cross-module:** Reads/writes all modules. Last to build.

**Roles:** `SUPER_ADMIN` (you) · `TENANT_ADMIN` (client) · `VENDOR_ADMIN` (vendor)

**V1 Features:**
- Products: full CRUD, image upload, variants
- Orders: view, filter, update status, fulfillment notes
- Customers: list, order history per customer
- Inventory: update stock, low-stock view
- Coupons: create, pause, view usage
- Vendors: approve/suspend, sales summary (tenant admin)
- Notification templates: edit per event
- Static pages: CMS-managed (About, Contact)
- Payment config: per-tenant provider + credentials (encrypted)

---

## 12. Non-Functional Requirements

### Performance
- API p99 < 500ms for catalog and cart endpoints under normal load
- **Cache Hit API p99 < 100ms** for product and category detail lookups
- Checkout (cart → order confirmed) < 3s end-to-end
- Typesense search < 50ms
- Supabase PgBouncer pooled connection required from day 1

### Security
- Webhook HMAC signature verification on every provider webhook
- Passwords bcrypt min 12 rounds
- Payment credentials encrypted at rest in DB (never in env vars globally — per-tenant in DB)
- R2 bucket private — Cloudflare Images for serving
- No raw SQL string interpolation — Drizzle parameterized only
- Rate limiting per tenant per endpoint via Redis
- JWT secrets per environment, rotatable without downtime
- `SUPER_ADMIN` service role key never exposed to API responses

### Reliability
- BullMQ DLQ on all queues — failure alerts via Sentry
- Payment webhooks: provider retries + idempotency handles all failure modes
- Cart inventory reservations: BullMQ TTL job releases if primary job fails
- All critical jobs: max retry 3, exponential backoff, failure handler defined

### Observability
- Structured JSON logs via Pino
- Request IDs on every request, propagated to BullMQ jobs
- Sentry error tracking
- Slow query monitoring via Supabase dashboard
- BullMQ Bull Board (dashboard) for job queue visibility

---

## 13. Infrastructure & Cost

### At 10 Tenants

| Service | Plan | Cost/mo |
|---------|------|---------|
| Railway (API + Workers) | Starter | ~$10 |
| Supabase | Pro | $25 |
| Upstash Redis | Pay-as-you-go | $0–10 |
| Cloudflare R2 | Free tier | $0–3 |
| Resend | 3,000/mo free | $0–5 |
| Typesense | Self-hosted on Railway | $0 (included) |
| Vercel (Storefront) | Hobby | $0 |
| **Total** | | **~$35–53/mo** |

### At 100 Tenants

| Service | Change | Cost/mo |
|---------|--------|---------|
| Railway | Scale API replicas + separate Typesense service | ~$40 |
| Supabase | Pro still sufficient (upgrade to Team if needed) | $25–$599 |
| Upstash Redis | More operations | $10–30 |
| Cloudflare R2 | More storage | $5–20 |
| Resend | Higher volume tier | $20–50 |
| **Total** | | **~$100–740/mo** |

Note: At 100 tenants you are generating serious revenue. This cost is still very low per tenant.

### Self-Hosted Cost (store owner)

| Service | Option | Cost/mo |
|---------|--------|---------|
| VPS (API + PostgreSQL + Redis + Typesense) | Hetzner CX32 | ~$15 |
| Storage | MinIO on same VPS or AWS S3 | $0–10 |
| Email | SMTP relay | $0–5 |
| **Total** | | **~$15–30/mo** |

---

## 14. Tenant Offboarding & Data Export

Available from day one.

**Export contents:** All orders + items, all customers + addresses, all products + variants, all reviews, loyalty ledger

**Format:** JSON + CSV per entity, single ZIP

**Process:**
1. Super admin triggers via admin panel
2. BullMQ export job runs, writes to `/{tenantId}/exports/{exportId}/` on R2
3. Signed download URL sent to super admin (expires 24hr)

**Self-hosting migration steps:**
1. Trigger export
2. Provide `nexus-engine/` package to store owner
3. They run `./scripts/setup.sh` on their VPS
4. Run `./scripts/import-data.sh` with the export ZIP
5. Update DNS
6. Remove tenant from multi-tenant deployment

---

## 15. Open Questions

| # | Question | Needed By |
|---|----------|-----------|
| 1 | Storefront: one default Next.js app or headless API only? | Before Phase 4 |
| 2 | Admin: Payload CMS or custom React admin? | Before Phase 3 |
| 3 | Auth: Supabase Auth or Clerk? Supabase more portable (GoTrue). | Before Phase 1 |
| 4 | Image optimization: Cloudflare Images or self-hosted imgproxy? | Before Phase 1 |
| 5 | Multi-vendor: vendor public `/vendors/[slug]` page in v1? | Before Phase 3 |
| 6 | Outbound webhooks for tenant integrations: v1 or defer? | Before Phase 2 |
| 7 | Static pages (About, Contact): in Payload or simple `pages` DB table? | Before Phase 3 |
| 8 | Self-hosting delivery: source code or Docker image? | Before first offboarding |
| 9 | Payment credentials: encrypted JSONB in DB or per-tenant secrets manager? | Before Phase 1 |

---

## 16. Appendix — Sub-PRD Templates

### PRD-MXX Template

```markdown
# PRD-MXX — Module Name
**Layer:** Core | Tenancy | Vendor
**Phase:** 1 | 2 | 3
**Estimate:** X days
**Depends on:** M01, M02
**Required by:** M07, M10

---
## Context
[2–3 sentences: problem this module solves, where it fits]

## V1 Scope (build exactly this)
[Explicit list — if not here, don't build it]

## Out of Scope (do not build in v1)
[Explicit list — prevents scope creep]

## Schema
[Full Drizzle schema for all tables in this module]

## API Contracts
[Every endpoint: method, path, Zod request schema, response schema, error codes]

## Business Logic Rules
[Numbered rules — agent must implement all]

## Edge Cases
[Edge case → expected behavior]

## Cross-Module Interactions
[Which services from other modules are called, and when]

## Schema Hooks (deferred)
[Columns/tables present but unused in v1]

## Acceptance Criteria
- [ ] [Testable checkbox]
```

### DESIGN-MXX Template

```markdown
# DESIGN-MXX — Module Name

## File Map
[Every file in module, what it does, what it imports]

## Database Schema (full DDL)
[CREATE TABLE statements with all constraints and indexes]

## Sequence Diagrams
[Key flows as ASCII sequence diagrams]

## Service Interface
[Public methods with TypeScript signatures and JSDoc]

## Repository Interface
[Public methods with TypeScript signatures]

## Environment Variables Used
[List of env vars this module reads]

## Known Gotchas
[Things that will cause bugs if not known]
```

### TASKS-MXX Template

```markdown
# TASKS-MXX — Module Name

## Prerequisites
- [ ] MXX complete

## Tasks

### T01 — Schema
**File:** `src/modules/xxx/xxx.schema.ts`
**What:** Create Drizzle table definitions
**Acceptance:** `drizzle-kit generate` succeeds, migration applies cleanly

### T02 — Repository
**File:** `src/modules/xxx/xxx.repository.ts`
**What:** [one sentence]
**Acceptance:** [how to verify]

## Integration Test
[Describe the full manual flow to verify the module end-to-end]

## Edge Case Checklist
- [ ] [edge case]
```

---

*Nexus Commerce — Master PRD v2.1 | Backend Engine | Confidential*

# PRD-M01 — Tenant Management

**Layer:** Tenancy | **Phase:** 1 | **Estimate:** 1 day
**Depends on:** Nothing (first module)
**Required by:** Every other module
**Source:** `src/layers/tenancy/`

---

## Context

Nexus Commerce is multi-tenant. Every request must be associated with a tenant. This module resolves the tenant from the incoming request (domain/subdomain), and injects `TenantContext` into the request. Repository methods use this context to enforce data isolation via explicit filtering. Without this module, nothing else works.

The initial production rollout is expected to be small but mixed-mode, with both `SINGLE_VENDOR` and `MULTI_VENDOR` tenants live from the beginning. Exact tenant and vendor counts may change, so M01 must treat tenant mode as a first-class operational setting, not a placeholder for later.

## V1 Scope (build exactly this)

### Tenant Entity
- `id` UUID, `name`, `slug` (unique), `custom_domain` (unique, nullable)
- `mode`: `SINGLE_VENDOR` | `MULTI_VENDOR`
- `status`: `onboarding` | `active` | `suspended`
- `currency` VARCHAR(3) default `INR`
- `timezone` VARCHAR default `Asia/Kolkata`
- `features` JSONB: `{ wishlist: bool, loyalty: bool, reviews: bool, cart_abandonment: bool }`
- `branding` JSONB: `{ primary_color, secondary_color, logo_url, favicon_url, font }`
- `notification_config` JSONB: `{ from_name, from_email }`

### Tenant Config (separate table)
- `shipping_flat_rate` INTEGER (smallest currency unit)
- `free_shipping_threshold` INTEGER | NULL
- `earn_rate` DECIMAL — loyalty points per ₹1
- `redeem_rate` DECIMAL — ₹1 per N points
- `cart_abandonment_delay_hours` INTEGER default 2
- `coupon_loyalty_stacking` BOOLEAN default false
- `return_window_days` INTEGER default 7

### Tenant Payment Config (separate table)
- `provider` VARCHAR default `razorpay`
- `credentials` JSONB (encrypted at rest)
- `webhook_secret` VARCHAR (encrypted at rest)
- `is_test_mode` BOOLEAN default false

### Domain Resolution Middleware
- Extract hostname from request
- Check `custom_domain` first, then `slug.nexuscommerce.app`
- Reject if tenant not found or status ≠ `active`
- Set `TenantContext` on request context
- Tenant mode must be present on every resolved request so downstream auth, catalog, inventory, order, and vendor logic can branch safely.

### Tenant Isolation Strategy
- Resolve tenant once in middleware and inject `TenantContext` into the request
- Pass `tenantId` explicitly into every tenant-scoped service and repository method
- Do not rely on database session state such as `SET LOCAL app.tenant_id` for request correctness

### Helper Libraries
- `src/lib/redis-keys.ts` — tenant-prefixed Redis key builders
- `src/lib/storage-paths.ts` — tenant-prefixed R2/S3 path builders
- `src/lib/queue-names.ts` — tenant-prefixed async queue name builders

## Out of Scope (do not build in v1)

- Tenant billing / subscription management
- Tenant self-service signup (super admin creates tenants)
- Tax configuration
- Payout configuration
- Multi-region tenant routing

## Schema

```typescript
// src/layers/tenancy/tenancy.schema.ts

import { pgTable, uuid, varchar, text, jsonb, boolean, integer, decimal, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const tenantModeEnum = pgEnum('tenant_mode', ['SINGLE_VENDOR', 'MULTI_VENDOR'])
export const tenantStatusEnum = pgEnum('tenant_status', ['onboarding', 'active', 'suspended'])

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  customDomain: varchar('custom_domain', { length: 255 }).unique(),
  mode: tenantModeEnum('mode').notNull().default('SINGLE_VENDOR'),
  status: tenantStatusEnum('status').notNull().default('onboarding'),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
  features: jsonb('features').notNull().default({
    wishlist: false,
    loyalty: false,
    reviews: false,
    cart_abandonment: false
  }),
  branding: jsonb('branding').notNull().default({
    primary_color: '#000000',
    secondary_color: '#ffffff',
    logo_url: null,
    favicon_url: null,
    font: 'Inter'
  }),
  notificationConfig: jsonb('notification_config').notNull().default({
    from_name: 'Store',
    from_email: 'noreply@nexuscommerce.app'
  }),

  // Schema hooks — present from day 1, null in v1
  taxConfig: jsonb('tax_config'),
  payoutConfig: jsonb('payout_config'),
  billingPlanId: uuid('billing_plan_id'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tenantConfig = pgTable('tenant_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  shippingFlatRate: integer('shipping_flat_rate').notNull().default(4900), // ₹49 in paise
  freeShippingThreshold: integer('free_shipping_threshold'),
  earnRate: decimal('earn_rate', { precision: 5, scale: 2 }).notNull().default('1.00'),
  redeemRate: decimal('redeem_rate', { precision: 5, scale: 2 }).notNull().default('100.00'),
  cartAbandonmentDelayHours: integer('cart_abandonment_delay_hours').notNull().default(2),
  couponLoyaltyStacking: boolean('coupon_loyalty_stacking').notNull().default(false),
  returnWindowDays: integer('return_window_days').notNull().default(7),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tenantPaymentConfig = pgTable('tenant_payment_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  provider: varchar('provider', { length: 50 }).notNull().default('razorpay'),
  credentials: jsonb('credentials').notNull(), // encrypted at rest
  webhookSecret: varchar('webhook_secret', { length: 255 }).notNull(), // encrypted
  isTestMode: boolean('is_test_mode').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

## API Contracts

### Admin Endpoints (super admin only)

```
POST   /admin/tenants              — Create tenant
GET    /admin/tenants              — List tenants
GET    /admin/tenants/:id          — Get tenant details
PATCH  /admin/tenants/:id          — Update tenant
PATCH  /admin/tenants/:id/status   — Activate / suspend tenant
PUT    /admin/tenants/:id/config   — Update tenant config
PUT    /admin/tenants/:id/payment  — Update payment config
POST   /admin/tenants/:id/admins   — Grant tenant admin to a customer in this tenant
DELETE /admin/tenants/:id/admins/:customerId — Revoke tenant admin from a customer in this tenant
```

### Internal (middleware, not exposed as API)

```
resolveTenanT(hostname) → TenantContext | null
resolveTenant(hostname) → TenantContext | null
```

## Business Logic Rules

1. Slug is immutable after creation
2. Custom domain must be verified before activation (v1: manual verification by super admin)
3. Suspended tenants return 503 to all storefront requests
4. `onboarding` tenants can only be accessed by super admin
5. Payment credentials are never returned in API responses — write-only
6. Feature flags default to `false` — enabling requires explicit config update
7. `mode` is an operational contract. `SINGLE_VENDOR` tenants must not expose vendor switching or marketplace-only flows.
8. `MULTI_VENDOR` tenants must resolve with the same tenant boundary as single-vendor tenants; vendor separation happens downstream and must never weaken tenant isolation.
9. Changing a tenant from `SINGLE_VENDOR` to `MULTI_VENDOR` is allowed only when dependent modules are ready for that tenant and must be an explicit super-admin action.
10. A tenant is the store boundary, not an actor. Tenant-admin is a role held by one or more customer records inside that tenant.
11. Tenant-admin assignment must be explicit and tenant-scoped; it must never be inferred from a global email allowlist.

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Request with unknown domain | 404 with tenant-not-found error |
| Request to suspended tenant | 503 with tenant-suspended error |
| Two tenants claim same custom domain | Unique constraint prevents; return 409 |
| Tenant slug with special characters | Validation: alphanumeric + hyphens only, 3–50 chars |
| Missing payment config | Tenant cannot be activated — status stays `onboarding` |

## Cross-Module Interactions

| Direction | Module | What |
|-----------|--------|------|
| **Provides** | All modules | `TenantContext` on every request |
| **Provides** | M08 | Payment provider + credentials via `TenantContext.payment` |
| **Provides** | M10 | Sender config via `TenantContext.notification` |
| **Provides** | M05, M06 | Shipping config via `TenantContext.config` |
| **Provides** | M12 | Loyalty rates via `TenantContext.config` |

## Schema Hooks (deferred)

| Column/Table | Purpose | Activate When |
|-------------|---------|---------------|
| `tax_config JSONB` | GST/VAT rates, registration numbers | Tax module added |
| `payout_config JSONB` | Platform bank details for vendor payouts | Automated payouts |
| `billing_plan_id UUID` | Subscription billing per tenant | SaaS billing |
| `trial_ends_at TIMESTAMPTZ` | Trial period for new tenants | SaaS billing |

## Acceptance Criteria

- [ ] Middleware correctly resolves tenantId from subdomain (`slug.nexuscommerce.app`)
- [ ] Middleware correctly resolves tenantId from custom domain
- [ ] Unknown domain returns 404
- [ ] Suspended tenant returns 503
- [ ] Tenant isolation verified: tenant A cannot see tenant B's data via repository queries
- [ ] `TenantContext` is fully hydrated on every request (config, features, payment, branding)
- [ ] Helper files exist: `redis-keys.ts`, `storage-paths.ts`, `queue-names.ts`
- [ ] All helper functions prefix with tenantId
- [ ] Payment credentials are write-only (not returned in GET responses)
- [ ] Tenant CRUD endpoints work for super admin
- [ ] `TenantContext.mode` is available on every resolved request and tested for both `SINGLE_VENDOR` and `MULTI_VENDOR`
- [ ] Tenant resolution and status handling remain correct for the initial production rollout footprint

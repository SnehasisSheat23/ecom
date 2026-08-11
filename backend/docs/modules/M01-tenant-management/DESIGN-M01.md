# DESIGN-M01 — Tenant Management

## File Map

| File | Purpose | Imports |
|------|---------|---------|
| `tenancy.schema.ts` | Drizzle table defs: `tenants`, `tenant_config`, `tenant_payment_config` | `drizzle-orm/pg-core` |
| `tenancy.types.ts` | `TenantContext`, `TenantMode`, `TenantStatus` interfaces | — |
| `tenancy.validators.ts` | Zod schemas for create/update tenant | `zod` |
| `tenancy.repository.ts` | All DB queries: find by domain, find by slug, CRUD | `tenancy.schema`, `db` |
| `tenancy.service.ts` | Business logic: resolve tenant, validate config | `tenancy.repository`, `tenancy.types` |
| `tenancy.routes.ts` | Admin CRUD endpoints | `tenancy.service`, `tenancy.validators` |
| `tenancy.test.ts` | Unit tests on service layer | `tenancy.service` |
| `tenant.middleware.ts` | Hono middleware: resolve tenant → set request context | `tenancy.service` |

## Production Rollout Assumption

The first production environment is expected to launch with a relatively small number of tenants, including a mix of `SINGLE_VENDOR` and `MULTI_VENDOR` stores from day one. Exact tenant counts and vendor counts are planning inputs and may change over time. The important design requirement is that tenant mode remains explicit and reliable in every request context, regardless of how many vendor-backed tenants are active.

### Shared Libraries Created by This Module

| File | Purpose |
|------|---------|
| `src/lib/redis-keys.ts` | `cartKey(tenantId, cartId)`, `rateLimitKey(tenantId, ip, endpoint)`, `idempotencyKey(tenantId, key)`, `productCacheKey(tenantId, slug)`, `categoryCacheKey(tenantId, slug)` |
| `src/lib/storage-paths.ts` | `productImagePath(tenantId, productId, filename)`, `vendorImagePath(tenantId, vendorId, filename)`, `exportPath(tenantId, exportId)` |
| `src/lib/queue-names.ts` | `cartAbandonmentQueue(tenantId)`, `searchSyncQueue(tenantId)`, `notificationQueue(tenantId)`, `inventoryReleaseQueue(tenantId)`, `exportQueue(tenantId)` |

## Database Schema (full DDL)

```sql
-- Enums
CREATE TYPE tenant_mode AS ENUM ('SINGLE_VENDOR', 'MULTI_VENDOR');
CREATE TYPE tenant_status AS ENUM ('onboarding', 'active', 'suspended');

-- Main tenants table
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(100) NOT NULL UNIQUE,
  custom_domain       VARCHAR(255) UNIQUE,
  mode                tenant_mode NOT NULL DEFAULT 'SINGLE_VENDOR',
  status              tenant_status NOT NULL DEFAULT 'onboarding',
  currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
  timezone            VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  features            JSONB NOT NULL DEFAULT '{"wishlist":false,"loyalty":false,"reviews":false,"cart_abandonment":false}',
  branding            JSONB NOT NULL DEFAULT '{"primary_color":"#000000","secondary_color":"#ffffff","logo_url":null,"favicon_url":null,"font":"Inter"}',
  notification_config JSONB NOT NULL DEFAULT '{"from_name":"Store","from_email":"noreply@nexuscommerce.app"}',

  -- Schema hooks (null in v1)
  tax_config          JSONB,
  payout_config       JSONB,
  billing_plan_id     UUID,
  trial_ends_at       TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-tenant operational config
CREATE TABLE tenant_config (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                      UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  shipping_flat_rate             INTEGER NOT NULL DEFAULT 4900,
  free_shipping_threshold        INTEGER,
  earn_rate                      DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  redeem_rate                    DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  cart_abandonment_delay_hours   INTEGER NOT NULL DEFAULT 2,
  coupon_loyalty_stacking        BOOLEAN NOT NULL DEFAULT false,
  return_window_days             INTEGER NOT NULL DEFAULT 7,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-tenant payment provider config
CREATE TABLE tenant_payment_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  provider          VARCHAR(50) NOT NULL DEFAULT 'razorpay',
  credentials       JSONB NOT NULL,
  webhook_secret    VARCHAR(255) NOT NULL,
  is_test_mode      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_status ON tenants(status);

-- Application-level tenant filtering
-- Every tenant-scoped repository query must include tenant_id in the predicate.
```

## Sequence Diagrams

### Domain Resolution Flow

```
Browser Request
      │
      ▼
tenant.middleware.ts
      │
      ├── Extract hostname from request
      │
      ├── Check custom_domain match
      │   └── Found? → Use that tenant
      │
      ├── Extract slug from subdomain (slug.nexuscommerce.app)
      │   └── Found? → Use that tenant
      │
      ├── Not found? → 404 response
      │
      ├── Status = 'suspended'? → 503 response
      │
      ├── Status = 'onboarding'? → Check if super admin → 403 if not
      │
      ├── Load tenant_config + tenant_payment_config
      │
      ├── Build TenantContext object
      │
      └── ctx.set('tenant', tenantContext) → next()
```

## Service Interface

```typescript
class TenancyService {
  /** Resolves tenant from hostname. Returns null if not found. */
  async resolveByHostname(hostname: string): Promise<TenantContext | null>

  /** Creates a new tenant. Returns the created tenant. */
  async createTenant(data: CreateTenantInput): Promise<Tenant>

  /** Updates tenant details. Throws if slug is being changed. */
  async updateTenant(tenantId: string, data: UpdateTenantInput): Promise<Tenant>

  /** Updates tenant status. Validates transitions. */
  async updateStatus(tenantId: string, status: TenantStatus): Promise<void>

  /** Updates tenant operational config. */
  async updateConfig(tenantId: string, data: UpdateTenantConfigInput): Promise<void>

  /** Updates payment provider config. Credentials encrypted before storage. */
  async updatePaymentConfig(tenantId: string, data: UpdatePaymentConfigInput): Promise<void>

  /** Grants tenant-admin access to a customer inside the tenant. */
  async grantTenantAdmin(tenantId: string, customerId: string): Promise<Customer>

  /** Revokes tenant-admin access from a customer inside the tenant. */
  async revokeTenantAdmin(tenantId: string, customerId: string): Promise<Customer>

  /** Lists all tenants with pagination. Super admin only. */
  async listTenants(page: number, perPage: number): Promise<PaginatedResult<Tenant>>

  /** Gets full tenant details including config. */
  async getTenant(tenantId: string): Promise<TenantWithConfig>

  /** Updates tenant mode. Super admin only. */
  async updateMode(tenantId: string, mode: TenantMode): Promise<void>
}
```

## Repository Interface

```typescript
class TenancyRepository {
  async findBySlug(slug: string): Promise<Tenant | null>
  async findByCustomDomain(domain: string): Promise<Tenant | null>
  async findById(id: string): Promise<Tenant | null>
  async findWithConfig(id: string): Promise<TenantWithConfig | null>
  async create(data: InsertTenant): Promise<Tenant>
  async update(id: string, data: Partial<InsertTenant>): Promise<Tenant>
  async updateConfig(tenantId: string, data: InsertTenantConfig): Promise<void>
  async updatePaymentConfig(tenantId: string, data: InsertTenantPaymentConfig): Promise<void>
  async list(page: number, perPage: number): Promise<PaginatedResult<Tenant>>
}
```

## Environment Variables Used

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Direct PostgreSQL connection | Yes |
| `DATABASE_POOL_URL` | PgBouncer pooled connection | Yes |
| `APP_SECRET` | JWT signing key | Yes |
| `SUPER_ADMIN_EMAIL` | Email of the super admin user | Yes |

## Known Gotchas

1. **Repository scoping is the isolation boundary.** Tenant-scoped queries must accept `tenantId` explicitly; bare ID lookups are not allowed on tenant tables.
2. **Tenant config caching.** On hot paths, consider caching `TenantContext` in Redis with a short TTL (e.g., 5 min) to avoid DB lookup on every request. Invalidate on config update.
 3. **Custom domain DNS.** In v1, custom domains are manually verified. The middleware does a DB lookup — this is fine for the initial production rollout but won't scale to thousands.
4. **Slug is immutable.** Once created, a tenant's slug cannot be changed because it's embedded in URLs, queue names, and storage paths. Enforce this in the service layer.
5. **Serverless portability.** Queue names and cache keys are stable app-level contracts. Today's default adapters are QStash and Upstash Redis, but the naming scheme must remain compatible with future BullMQ + Redis adapters.
6. **Mode is downstream-critical.** `TenantContext.mode` must always be hydrated because auth, vendor routing, catalog ownership, and marketplace-only features depend on it.
7. **Mode flips are controlled operations.** Switching a tenant to `MULTI_VENDOR` should be treated as a supervised rollout step, not an incidental config edit.
8. **Tenant-admin is not the tenant itself.** The tenant is the store boundary. Tenant-admin is a per-customer role inside that tenant and is currently stored on `customers.is_admin`.

# TASKS-M01 — Tenant Management

## Prerequisites

- [ ] PostgreSQL database running
- [ ] Drizzle ORM configured (`src/lib/db.ts`)
- [ ] Hono app scaffold (`src/index.ts`)
- [ ] Cache/queue environment variables documented for local and serverless runtimes

## Tasks

### T01 — Schema Definition
**File:** `src/layers/tenancy/tenancy.schema.ts`
**What:** Define Drizzle table schemas for `tenants`, `tenant_config`, `tenant_payment_config` with all columns, types, defaults, and schema hooks as specified in DESIGN-M01.
**Acceptance:** `drizzle-kit generate` succeeds and produces clean migration SQL.

### T02 — Types & Enums
**File:** `src/layers/tenancy/tenancy.types.ts`
**What:** Define `TenantContext`, `TenantMode`, `TenantStatus`, `TenantFeatures`, `TenantBranding`, `TenantConfig`, `TenantPaymentConfig` TypeScript interfaces. Export the full `TenantContext` interface as specified in `docs/CONTRACTS.md` §1.
**Acceptance:** All interfaces importable by other modules. No `any` types.

### T03 — Validators
**File:** `src/layers/tenancy/tenancy.validators.ts`
**What:** Zod schemas for `CreateTenantInput`, `UpdateTenantInput`, `UpdateTenantConfigInput`, `UpdatePaymentConfigInput`. Slug validation: alphanumeric + hyphens, 3–50 chars.
**Acceptance:** Invalid payloads rejected with descriptive error messages.

### T04 — Repository
**File:** `src/layers/tenancy/tenancy.repository.ts`
**What:** Implement all repository methods: `findBySlug`, `findByCustomDomain`, `findById`, `findWithConfig`, `create`, `update`, `updateConfig`, `updatePaymentConfig`, `list`. All tenant-scoped methods must accept `tenant_id` as the first argument.
**Acceptance:** Each method queries the correct tables and includes the `tenant_id` predicate.

### T05 — Service
**File:** `src/layers/tenancy/tenancy.service.ts`
**What:** Implement `resolveByHostname` (hostname → TenantContext), `createTenant`, `updateTenant` (enforce slug immutability), `updateStatus`, `updateConfig`, `updatePaymentConfig`, `listTenants`, `getTenant`.
**Acceptance:** Slug change attempt throws error. Status validation works. Payment credentials are never leaked.

### T06 — Tenant Middleware
**File:** `src/middleware/tenant.middleware.ts`
**What:** Hono middleware that: extracts hostname, calls `resolveByHostname`, returns 404/503/403 as appropriate, sets `TenantContext` on request context.
**Acceptance:** Middleware correctly injects `ctx.tenant` on every request. Unknown domains → 404. Suspended → 503.

### T07 — Admin Routes
**File:** `src/layers/tenancy/tenancy.routes.ts`
**What:** Admin CRUD endpoints: POST/GET/PATCH tenants, PATCH status, PUT config, PUT payment. All behind super admin auth check.
**Acceptance:** All 7 endpoints work. Non-super-admin gets 403.

### T08 — Redis Key Helpers
**File:** `src/lib/redis-keys.ts`
**What:** Export functions: `cartKey(tenantId, cartId)`, `rateLimitKey(tenantId, ip, endpoint)`, `idempotencyKey(tenantId, key)`, `productCacheKey(tenantId, slug)`, `categoryCacheKey(tenantId, slug)`, `catalogListKey(tenantId, hash)`.
**Acceptance:** All keys prefixed with `tenant:{tenantId}:`.

### T09 — Storage Path Helpers
**File:** `src/lib/storage-paths.ts`
**What:** Export functions: `productImagePath(tenantId, productId, filename)`, `vendorImagePath(tenantId, vendorId, filename)`, `exportPath(tenantId, exportId)`.
**Acceptance:** All paths start with `/{tenantId}/`.

### T10 — Queue Name Helpers
**File:** `src/lib/queue-names.ts`
**What:** Export functions: `cartAbandonmentQueue(tenantId)`, `searchSyncQueue(tenantId)`, `notificationQueue(tenantId)`, `inventoryReleaseQueue(tenantId)`, `exportQueue(tenantId)`.
**Acceptance:** All queue names follow pattern `tenant:{tenantId}:{queue-name}` and do not leak provider-specific details.

### T11 — Isolation Verification
**File:** `src/layers/tenancy/tenancy.test.ts`
**What:** Write a test that attempts to access tenant A's data using tenant B's context.
**Acceptance:** The query returns 0 rows or is rejected before execution.

### T12 — Unit Tests
**File:** `src/layers/tenancy/tenancy.test.ts`
**What:** Test: slug immutability, status transitions, domain resolution (subdomain + custom domain), cross-tenant isolation, suspended tenant rejection.
**Acceptance:** All tests pass. Cross-tenant test proves isolation.

## Integration Test

Full flow:
1. Create tenant A via admin API
2. Create tenant B via admin API
3. Activate both tenants
4. Request with tenant A's domain → TenantContext has tenant A's config
5. Request with tenant B's domain → TenantContext has tenant B's config
6. Insert data as tenant A → query as tenant B → data not visible (Isolation test)
7. Suspend tenant A → request returns 503
8. Request with unknown domain → returns 404

## Edge Case Checklist

- [ ] Duplicate slug returns 409
- [ ] Duplicate custom domain returns 409
- [ ] Slug with special characters rejected by validator
- [ ] Attempting to change slug returns error
- [ ] Missing payment config prevents activation
- [ ] Onboarding tenant returns 403 for non-super-admin requests
- [ ] Empty features JSONB defaults correctly

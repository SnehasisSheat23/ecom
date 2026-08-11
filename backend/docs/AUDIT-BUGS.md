# Production Audit — Bug Task List

> Generated: 2026-04-06
> Scope: All implemented modules (M01–M08, M14)
> Status: 🔴 = Critical / 🟠 = Important / 🟡 = Moderate / 🟢 = Low

---

## 🔴 CRIT-1 — Tenant Middleware `isSuperAdmin` Ordering Bug

**Priority**: P0 — Blocking
**Module**: Middleware
**File**: `src/middleware/tenant.middleware.ts`
**Line**: 20

### What's Wrong

The tenant middleware checks `c.get('isSuperAdmin')` to allow super admins through the onboarding gate.
But `isSuperAdmin` is set by the **auth middleware**, which runs **after** tenant middleware.
So `c.get('isSuperAdmin')` is always `undefined` at this point.

### Current Code

```typescript
// src/middleware/tenant.middleware.ts:20
if (tenant.status === 'onboarding' && !c.get('isSuperAdmin')) {
  throw new AppError('Tenant is onboarding', 403, 'tenant-onboarding')
}
```

### What To Fix

**Option A** — Move the onboarding check to a separate middleware that runs after auth:

```typescript
// NEW: src/middleware/onboarding-guard.middleware.ts
export const createOnboardingGuard = (): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const tenant = c.get('tenant')
    if (tenant.status === 'onboarding' && !c.get('isSuperAdmin')) {
      throw new AppError('Tenant is onboarding', 403, 'tenant-onboarding')
    }
    await next()
  }
}
```

Then in `src/lib/app.ts`, register it after `createAuthMiddleware` for relevant routes.

**Option B** — Remove the onboarding check from tenant middleware entirely and let the auth layer handle it:

```typescript
// src/middleware/tenant.middleware.ts — remove line 20-22
// The onboarding status should be checked at the route level where auth context is available
```

### Affected Tests

- `tests/integration/m01/tenancy.integration.test.ts` — add a test case:
  - Create a tenant with `status: 'onboarding'`
  - As super admin, assert access is allowed (currently fails)
  - As regular user, assert 403

---

## 🔴 CRIT-2 — `isAdmin` Flag is Global, Not Tenant-Scoped

**Priority**: P0 — Security
**Module**: Auth / Core Lib
**Files**:
- `src/lib/admin.ts` (lines 1–16)
- `src/modules/customers/customers.service.ts` (wherever `isConfiguredAdminEmail` is called)

### What's Wrong

`isConfiguredAdminEmail()` checks `SUPER_ADMIN_EMAIL` and `ADMIN_EMAILS` env vars.
These are **global**. If `admin@clientA.com` is in `ADMIN_EMAILS`, that email gets `isAdmin = true`
in **every tenant** they register with.

With 10 clients, any admin email configured globally becomes admin across all tenants.
A client admin registers on another client's store → instant admin access.

### Current Code

```typescript
// src/lib/admin.ts
export const isConfiguredAdminEmail = (email: string): boolean => {
  const normalizedEmail = email.trim().toLowerCase()
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  if (superAdminEmail && normalizedEmail === superAdminEmail) {
    return true
  }
  return parseCsv(process.env.ADMIN_EMAILS).includes(normalizedEmail)
}
```

### What To Fix

1. **Keep `SUPER_ADMIN_EMAIL`** — this is the platform operator, global is correct.

2. **Remove `ADMIN_EMAILS` from env** — replace with a per-tenant admin designation stored in the DB.

3. **Add a `tenant_admins` approach** — either:
   - Add a join table `tenant_admins(tenant_id, customer_id)`, OR
   - Use the existing `customers.isAdmin` field but only set it via super-admin API, not auto-derived at registration

4. **Update `customers.service.ts`** — in the `register` method, change:
   ```typescript
   // BEFORE (auto-admin for any email in the global list):
   isAdmin: isConfiguredAdminEmail(payload.email)

   // AFTER (only super admin gets auto-admin everywhere):
   isAdmin: isSuperAdminEmail(payload.email)
   ```

5. **Add a new route** for super admins to designate tenant admins:
   ```
   POST /admin/tenants/:tenantId/admins { customerId }
   ```

6. **Update `src/lib/admin.ts`**:
   ```typescript
   // Keep only super admin check
   export const isSuperAdminEmail = (email: string): boolean => {
     const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
     return Boolean(superAdminEmail && email.trim().toLowerCase() === superAdminEmail)
   }
   ```

### Affected Files

- `src/lib/admin.ts` — rewrite
- `src/modules/customers/customers.service.ts` — update `register()` method
- `src/middleware/auth.middleware.ts` — update `isSuperAdmin` derivation
- `tests/integration/m02/customers.integration.test.ts` — add cross-tenant admin isolation test

---

## 🔴 CRIT-3 — Vendor Membership Upsert Missing `tenantId` Verification

**Priority**: P1
**Module**: Vendor (M14)
**File**: `src/layers/vendor/vendor.repository.ts`
**Line**: 143–148

### What's Wrong

`addMember` uses `onConflictDoUpdate` targeting the unique index on `[vendorId, customerId]`.
This unique index does **not** include `tenantId`. If a UUID collision occurred across tenants,
the upsert could update a row belonging to a different tenant.

### Current Code

```typescript
// src/layers/vendor/vendor.repository.ts:143-148
const [row] = await this.db
  .insert(vendorMembers)
  .values({ tenantId, vendorId, customerId: input.customerId, role: input.role })
  .onConflictDoUpdate({
    target: [vendorMembers.vendorId, vendorMembers.customerId],
    set: { role: input.role, updatedAt: new Date() },
  })
  .returning()
```

### What To Fix

**Option A** — Add `tenantId` to the conflict target and update the unique index in the schema:

```typescript
// src/layers/vendor/vendor.schema.ts — update the unique index
// BEFORE:
uniqueIndex('uq_vendor_member_vendor_customer').on(table.vendorId, table.customerId)
// AFTER:
uniqueIndex('uq_vendor_member_tenant_vendor_customer').on(table.tenantId, table.vendorId, table.customerId)
```

```typescript
// src/layers/vendor/vendor.repository.ts — update the conflict target
.onConflictDoUpdate({
  target: [vendorMembers.tenantId, vendorMembers.vendorId, vendorMembers.customerId],
  set: { role: input.role, updatedAt: new Date() },
})
```

**Option B** — Add a `where` clause to the `onConflictDoUpdate`:

```typescript
.onConflictDoUpdate({
  target: [vendorMembers.vendorId, vendorMembers.customerId],
  set: { role: input.role, updatedAt: new Date() },
  where: eq(vendorMembers.tenantId, tenantId),
})
```

### Migration Required

If using Option A, a new migration is needed to drop the old unique index and create the new one.

---

## 🔴 CRIT-4 — Payout Idempotency Key Uses `Date.now()`

**Priority**: P1
**Module**: Vendor (M14)
**File**: `src/layers/vendor/vendor.service.ts`
**Line**: 158

### What's Wrong

The idempotency key for payout ledger entries uses `Date.now()`, which generates a unique key
on every call. If a client retries a payout request (network timeout, etc.), it creates duplicate
payout entries in the vendor ledger.

### Current Code

```typescript
// src/layers/vendor/vendor.service.ts:158
idempotencyKey: `payout:${vendorId}:${Date.now()}`
```

### What To Fix

Accept a client-provided idempotency key in the payout request:

```typescript
// src/layers/vendor/vendor.validators.ts — add to payout schema
export const recordPayoutSchema = z.object({
  amount: z.number().int().positive(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1).max(255),  // ADD THIS
})
```

```typescript
// src/layers/vendor/vendor.service.ts:158 — use the provided key
idempotencyKey: input.idempotencyKey ?? `payout:${vendorId}:${Date.now()}`
```

```typescript
// src/layers/vendor/vendor.routes.ts — pass it through
await vendorService.recordPayout(tenantId, vendorId, {
  ...payload,
  idempotencyKey: payload.idempotencyKey,
}, actor)
```

### Affected Tests

- `src/layers/vendor/vendor.test.ts` — add test: calling payout twice with same key → single ledger entry

---

## 🔴 CRIT-5 — `setProductCategories` DELETE Missing `tenantId` Filter

**Priority**: P0
**Module**: Catalog (M03)
**File**: `src/modules/catalog/catalog.repository.ts`
**Line**: 422

### What's Wrong

The DELETE query that clears a product's category associations uses only `productId` —
**no `tenantId` filter**. This violates the hard rule that every tenant-scoped query must
include `tenantId`.

### Current Code

```typescript
// src/modules/catalog/catalog.repository.ts:422
await this.db.delete(productCategories).where(eq(productCategories.productId, productId))
```

### What To Fix

```typescript
// src/modules/catalog/catalog.repository.ts:422
await this.db.delete(productCategories).where(
  and(eq(productCategories.tenantId, tenantId), eq(productCategories.productId, productId))
)
```

One-line change. The `and` import is already at the top of the file.

---

## 🟠 MOD-1 — Cart/Orders Variant Snapshot Joins Missing `products.tenantId`

**Priority**: P2
**Module**: Cart (M06) / Orders (M07)
**Files**:
- `src/modules/cart/cart.repository.ts` lines 181–200
- `src/modules/orders/orders.repository.ts` lines 132–152

### What's Wrong

Both `getVariantSnapshots` methods join `variants` → `products` using only `variants.productId = products.id`.
The join does NOT include `products.tenantId = tenantId`. While the FK constraint ensures a variant's
product is in the same tenant, adding tenant filtering to the join is defense-in-depth.

### Current Code (cart.repository.ts)

```typescript
// src/modules/cart/cart.repository.ts:199
.from(variants)
.innerJoin(products, eq(variants.productId, products.id))
.where(and(eq(variants.tenantId, tenantId), inArray(variants.id, variantIds)))
```

### What To Fix

```typescript
// src/modules/cart/cart.repository.ts:199
.from(variants)
.innerJoin(products, and(eq(variants.productId, products.id), eq(products.tenantId, tenantId)))
.where(and(eq(variants.tenantId, tenantId), inArray(variants.id, variantIds)))
```

Same change in `src/modules/orders/orders.repository.ts:150`:

```typescript
.innerJoin(products, and(eq(variants.productId, products.id), eq(products.tenantId, tenantId)))
```

---

## 🟠 MOD-2 — Admin Order List Has No Vendor Scoping

**Priority**: P1
**Module**: Orders (M07)
**Files**:
- `src/modules/orders/orders.routes.ts` lines 100–106
- `src/modules/orders/orders.service.ts` — `listAdminOrders` method
- `src/modules/orders/orders.repository.ts` — `listAdminOrders` method

### What's Wrong

`GET /admin/orders` only checks `isAdmin || isSuperAdmin` at the route level.
There's no vendor scoping. A vendor staff member who has been granted admin-level
route access through the auth middleware would see **all orders** for the tenant,
not just orders containing their vendor's products.

### Current Code

```typescript
// src/modules/orders/orders.routes.ts:100-106
app.get('/admin/orders', async (c) => {
  if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
    throw new AppError('Admin access required', 403, 'forbidden')
  }
  const query = listOrdersQuerySchema.parse(c.req.query())
  return c.json({ data: await service.listAdminOrders(c.get('tenant').tenantId, query.status) })
})
```

### What To Fix

1. **Update route** to pass actor context:

```typescript
// src/modules/orders/orders.routes.ts
app.get('/admin/orders', async (c) => {
  const actor = c.get('customer')
  if (!c.get('isAdmin') && !c.get('isSuperAdmin') && !actor?.activeVendorId) {
    throw new AppError('Admin or vendor access required', 403, 'forbidden')
  }
  const query = listOrdersQuerySchema.parse(c.req.query())
  return c.json({
    data: await service.listAdminOrders(c.get('tenant').tenantId, query.status, actor),
  })
})
```

2. **Update service** to scope by vendor:

```typescript
// src/modules/orders/orders.service.ts
async listAdminOrders(
  tenantId: string,
  status?: OrderStatus,
  actor?: AuthenticatedCustomer,
): Promise<OrderListItem[]> {
  const vendorId = actor && !actor.isAdmin && !actor.isSuperAdmin
    ? actor.activeVendorId
    : undefined
  return this.repository.listAdminOrders(tenantId, { status, vendorId })
}
```

3. **Update repository** to filter by vendor:

```typescript
// src/modules/orders/orders.repository.ts
async listAdminOrders(tenantId: string, filters: OrderFilters = {}): Promise<OrderListItem[]> {
  const conditions = [eq(orders.tenantId, tenantId)]
  if (filters.status) conditions.push(eq(orders.status, filters.status))
  if (filters.vendorId) {
    // Join with order_items and filter by vendorId
    // ... vendor-scoped query
  }
  // ...existing query
}
```

---

## 🟠 MOD-3 — Orders Status Update Route Has No Vendor Ownership Check

**Priority**: P2
**Module**: Orders (M07)
**File**: `src/modules/orders/orders.routes.ts`
**Line**: 108–119

### What's Wrong

`PATCH /admin/orders/:id/status` only checks `isAdmin || isSuperAdmin`. The `updateStatus`
service method itself has no vendor ownership check. If vendor-level order management is added
in the future, this becomes a vector for vendors changing other vendors' order statuses.

### Current Code

```typescript
// src/modules/orders/orders.routes.ts:108-119
app.patch('/admin/orders/:id/status', async (c) => {
  if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
    throw new AppError('Admin access required', 403, 'forbidden')
  }
  // ...
})
```

### What To Fix

No immediate change required since the route guard correctly blocks non-admins.
However, when adding vendor order management:

```typescript
// Future: src/modules/orders/orders.service.ts — updateStatus
// Add vendor ownership check before allowing status change
if (actor && !actor.isAdmin && !actor.isSuperAdmin && actor.activeVendorId) {
  const order = await this.repository.getOrderDetail(tenantId, orderId)
  const hasVendorItems = order.items.some(item => item.vendorId === actor.activeVendorId)
  if (!hasVendorItems) {
    throw new AppError('Forbidden', 403, 'forbidden')
  }
}
```

---

## 🟠 MOD-4 — Webhook Route Uses URL `tenantId`, Not Hostname Resolution

**Priority**: P1
**Module**: Payments (M08)
**File**: `src/modules/payments/payments.routes.ts`
**Line**: 41–49

### What's Wrong

The webhook handler uses `params.tenantId` from the URL path, but the tenant middleware also
resolves a tenant from the hostname. If these don't match (misconfigured webhook URL), you
could process a webhook against the wrong tenant's payment config.

The risk is mitigated because `handleWebhook` loads payment config by `params.tenantId` and
verifies the webhook signature against that config's secret. But an explicit assertion is better.

### Current Code

```typescript
// src/modules/payments/payments.routes.ts:41-49
app.post('/webhooks/:provider/:tenantId', async (c) => {
  const params = paymentWebhookParamsSchema.parse(c.req.param())
  // Uses params.tenantId, does NOT verify against c.get('tenant').tenantId
  await service.handleWebhook(params.tenantId, params.provider, rawBody, signature, webhookEventId)
})
```

### What To Fix

Add an assertion that the URL-provided tenantId matches the hostname-resolved tenant:

```typescript
// src/modules/payments/payments.routes.ts
app.post('/webhooks/:provider/:tenantId', async (c) => {
  const params = paymentWebhookParamsSchema.parse(c.req.param())
  const resolvedTenant = c.get('tenant')

  if (resolvedTenant.tenantId !== params.tenantId) {
    throw new AppError('Webhook tenant mismatch', 400, 'webhook-tenant-mismatch')
  }

  // ...rest of handler
})
```

---

## 🟡 MOD-5 — Guest Session `deleteExpired()` Has No Tenant Scope

**Priority**: P2
**Module**: Customers (M02)
**File**: `src/modules/customers/customers.repository.ts`
**Line**: 216–222

### What's Wrong

`deleteExpired()` deletes **all** expired guest sessions across **all** tenants in one query.
While this is a cleanup-only operation (no data leakage), it violates the architectural principle
that every database operation must be tenant-scoped.

### Current Code

```typescript
// src/modules/customers/customers.repository.ts
async deleteExpired(): Promise<number> {
  const result = await this.db
    .delete(guestSessions)
    .where(lte(guestSessions.expiresAt, new Date()))
  return result.rowCount ?? 0
}
```

### What To Fix

Add `tenantId` parameter:

```typescript
async deleteExpired(tenantId: string): Promise<number> {
  const result = await this.db
    .delete(guestSessions)
    .where(and(
      eq(guestSessions.tenantId, tenantId),
      lte(guestSessions.expiresAt, new Date())
    ))
  return result.rowCount ?? 0
}
```

If you need a cross-tenant cleanup job (e.g., a cron), call it once per tenant in a loop.

---

## 🟡 HARD-1 — Missing Suspended Tenant Check in Auth Middleware

**Priority**: P2
**Module**: Middleware
**File**: `src/middleware/auth.middleware.ts`

### What's Wrong

The auth middleware validates JWT and checks tenant match, but doesn't verify tenant status.
If tenant middleware is bypassed on internal routes, an authenticated user on a suspended tenant
could still make API calls.

### What To Fix

Add a defense-in-depth check after tenant resolution:

```typescript
// src/middleware/auth.middleware.ts — after line 28
const tenant = c.get('tenant')
if (tenant.status === 'suspended') {
  throw new AppError('Tenant is suspended', 403, 'tenant-suspended')
}
```

---

## 🟡 HARD-2 — No Rate Limiting on Vendor Admin Routes

**Priority**: P2
**Module**: Vendor (M14)
**File**: `src/layers/vendor/vendor.routes.ts`

### What's Wrong

`/admin/vendors` routes have no rate limiting. A compromised admin token could create
thousands of vendors or payout entries.

### What To Fix

```typescript
// src/layers/vendor/vendor.routes.ts
const adminRateLimit = createRateLimitMiddleware({ limit: 30, windowMs: 60 * 1000 })

app.post('/admin/vendors', adminRateLimit, async (c) => { /* ... */ })
app.post('/admin/vendors/:vendorId/payouts', adminRateLimit, async (c) => { /* ... */ })
app.post('/admin/vendors/:vendorId/members', adminRateLimit, async (c) => { /* ... */ })
```

---

## 🟡 HARD-3 — Tenant Context Not Cached

**Priority**: P2
**Module**: Tenancy (M01)
**File**: `src/layers/tenancy/tenancy.service.ts` — `resolveByHostname`

### What's Wrong

Every API request calls `resolveByHostname` which makes 2–3 database queries
(custom domain lookup, then tenant + config + payment join). With 10 tenants × N req/sec,
this is the hottest path in the system.

### What To Fix

Cache the `TenantContext` in Redis with hostname as key and 30–60s TTL:

```typescript
// src/layers/tenancy/tenancy.service.ts
async resolveByHostname(hostname: string): Promise<TenantContext | null> {
  const cacheKey = `tenant:host:${hostname}`
  const cached = await this.cache?.get<TenantContext>(cacheKey)
  if (cached) return cached

  const tenant = await this.repository.findByHostname(hostname)
  if (!tenant) return null

  const context = await this.buildContext(tenant)
  await this.cache?.set(cacheKey, context, 60) // 60s TTL
  return context
}
```

Invalidate on tenant config updates in `updateTenant`, `updatePaymentConfig`, `updateStatus`.

---

## 🟢 HARD-4 — JWT Doesn't Encode Tenant `mode`

**Priority**: P3
**Module**: Auth
**File**: `src/lib/auth.ts`

### What's Wrong

The JWT payload includes `tenantId`, `email`, and `activeVendorId`, but not `mode`
(`SINGLE_VENDOR` vs `MULTI_VENDOR`). Every request must hit the DB to check vendor features.

### What To Fix

```typescript
// src/lib/auth.ts — AuthTokenPayload
export interface AuthTokenPayload {
  sub: string
  tenantId: string
  email: string
  activeVendorId: string | null
  tenantMode: 'SINGLE_VENDOR' | 'MULTI_VENDOR'  // ADD
  type: 'access'
  exp: number
  iat: number
}
```

Update `createAccessToken` and `verifyAccessToken` to include `tenantMode`.

---

## 🟢 HARD-5 — Missing Cross-Tenant Customer Integration Test

**Priority**: P3
**Module**: Tests
**File**: `tests/integration/m02/customers.integration.test.ts`

### What's Wrong

No integration test verifies that Customer A on Tenant 1 cannot be resolved by Tenant 2.

### What To Fix

Add a test case:

```typescript
it('isolates customers across tenants', async () => {
  const tenant1 = await createTenant('Store A', 'store-a', ...)
  const tenant2 = await createTenant('Store B', 'store-b', ...)

  // Register same email on both tenants
  const reg1 = await register(tenant1Host, { email: 'shared@example.com', password: 'pass123' })
  const reg2 = await register(tenant2Host, { email: 'shared@example.com', password: 'pass123' })

  // Different customer IDs
  expect(reg1.customerId).not.toBe(reg2.customerId)

  // Tenant 1's token can't access Tenant 2
  const crossAccess = await app().request(`https://${tenant2Host}/me`, {
    headers: { authorization: `Bearer ${reg1.accessToken}` },
  })
  expect(crossAccess.status).toBe(401) // tenant mismatch in JWT
})
```

---

## 🟢 HARD-6 — `updateVendor` / `updateVariant` Missing Null Check on Return

**Priority**: P3
**Module**: Vendor (M14) / Catalog (M03)
**Files**:
- `src/layers/vendor/vendor.repository.ts` line 124
- `src/modules/catalog/catalog.repository.ts` line 319

### What's Wrong

If the UPDATE WHERE clause matches zero rows (wrong `tenantId` or ID), the `row` variable
is `undefined` and `mapXxx(undefined)` throws an unhandled runtime error instead of returning
`null` for a clean 404 at the service layer.

### What To Fix

```typescript
// src/layers/vendor/vendor.repository.ts:124
const [row] = await this.db.update(vendors)...returning()
if (!row) {
  throw new AppError('Vendor not found', 404, 'vendor-not-found')
}
return mapVendor(row)
```

```typescript
// src/modules/catalog/catalog.repository.ts:319
const [row] = await this.db.update(variants)...returning()
if (!row) {
  throw new AppError('Variant not found', 404, 'variant-not-found')
}
return mapVariant(row)
```

---

## 🟢 HARD-7 — Inventory `variantId` Unique Constraint is Global

**Priority**: P3
**Module**: Inventory (M04)
**File**: `src/modules/inventory/inventory.schema.ts`
**Line**: 12

### What's Wrong

The inventory table has `variantId` as `.unique()` which creates a **global** unique constraint,
not per-tenant. Since `variant_id` is a UUID FK, it's globally unique by default.
But the `locationId` column exists, suggesting eventual support for multiple inventory locations
per variant — which this global unique constraint would block.

### Current Code

```typescript
variantId: uuid('variant_id').notNull().references(() => variants.id).unique()
```

### What To Fix (future-proofing)

```typescript
// Remove .unique() from column, add composite unique index instead:
variantId: uuid('variant_id').notNull().references(() => variants.id)

// In the index array:
uniqueIndex('uq_inventory_tenant_variant_location')
  .on(table.tenantId, table.variantId, table.locationId)
```

**Note**: Only do this when implementing multi-location inventory. For now, document it.

---

## 🟢 HARD-8 — `saved_for_later_items` Table Has No Repository

**Priority**: P3
**Module**: Cart (M06)
**File**: `src/modules/cart/cart.schema.ts` line 68–78

### What's Wrong

The `saved_for_later_items` table is defined in the schema but has no corresponding
repository methods, service methods, or route handlers. It's dead schema.

### What To Fix

Either:
- Remove it from the schema if not planned for Phase 1, OR
- Implement the repository + service + route when needed

---

## Summary Table

| # | ID | Severity | Module | File | Line | Status |
|---|-----|----------|--------|------|------|--------|
| 1 | CRIT-1 | 🔴 P0 | Middleware | `tenant.middleware.ts` | 20 | `[x]` ✅ |
| 2 | CRIT-2 | 🔴 P0 | Auth/Admin | `admin.ts`, `customers.service.ts` | — | `[x]` ✅ |
| 3 | CRIT-3 | 🟠 P1 | Vendor | `vendor.repository.ts` | 143 | `[x]` ✅ |
| 4 | CRIT-4 | 🟠 P1 | Vendor | `vendor.service.ts` | 158 | `[x]` ✅ |
| 5 | CRIT-5 | 🔴 P0 | Catalog | `catalog.repository.ts` | 422 | `[x]` ✅ |
| 6 | MOD-1 | 🟡 P2 | Cart/Orders | `cart.repository.ts`, `orders.repository.ts` | 199, 150 | `[x]` ✅ |
| 7 | MOD-2 | 🟠 P1 | Orders | `orders.routes.ts` | 100 | `[x]` ✅ |
| 8 | MOD-3 | 🟡 P2 | Orders | `orders.routes.ts` | 108 | `[x]` ✅ |
| 9 | MOD-4 | 🟠 P1 | Payments | `payments.routes.ts` | 41 | `[x]` ✅ |
| 10 | MOD-5 | 🟡 P2 | Customers | `customers.repository.ts` | 216 | `[x]` ✅ |
| 11 | HARD-1 | 🟡 P2 | Middleware | `auth.middleware.ts` | — | `[x]` ✅ |
| 12 | HARD-2 | 🟡 P2 | Vendor | `vendor.routes.ts` | — | `[x]` ✅ |
| 13 | HARD-3 | 🟡 P2 | Tenancy | `tenancy.service.ts` | — | `[x]` ✅ |
| 14 | HARD-4 | 🟢 P3 | Auth | `auth.ts` | — | `[x]` ✅ |
| 15 | HARD-5 | 🟢 P3 | Tests | `customers.integration.test.ts` | — | `[x]` ✅ |
| 16 | HARD-6 | 🟢 P3 | Vendor/Catalog | `vendor.repository.ts`, `catalog.repository.ts` | 124, 319 | `[x]` ✅ |
| 17 | HARD-7 | 🟢 P3 | Inventory | `inventory.schema.ts` | 12 | `[x]` ✅ |
| 18 | HARD-8 | 🟢 P3 | Cart | `cart.schema.ts` | 68 | `[x]` ✅ |

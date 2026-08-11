# TASKS-M02 — Auth & Customers

## Prerequisites

- [x] M01 Tenant Management complete
- [ ] Auth middleware scaffold ready

## Tasks

### T01 — Schema
**File:** `src/modules/customers/customers.schema.ts`
**What:** Drizzle tables for `customers`, `addresses`, `guest_sessions` with all constraints and schema hooks.
**Acceptance:** Migration applies cleanly. Unique constraint `(tenant_id, email)` on customers.

### T02 — Types & Validators
**Files:** `customers.types.ts`, `customers.validators.ts`
**What:** TypeScript interfaces + Zod schemas for register, login, profile update, address CRUD.
**Acceptance:** Password validation (min 8 chars), email format validation, address field validation.

### T03 — Customer Repository
**File:** `customers.repository.ts`
**What:** `findByEmail`, `findById`, `findBySupabaseId`, `create`, `update`, `softDelete`.
**Acceptance:** All queries include tenant_id. Soft delete sets `deleted_at`.

### T04 — Address Repository
**File:** `customers.repository.ts` (same file, separate class)
**What:** `findByCustomer`, `findById`, `create`, `update`, `delete`, `countByCustomer`, `clearDefaultShipping`, `clearDefaultBilling`.
**Acceptance:** Default flag toggle works atomically.

### T05 — Guest Session Repository
**File:** `customers.repository.ts`
**What:** `create`, `findById`, `linkCart`, `delete`, `deleteExpired`.
**Acceptance:** Expired sessions cleanable via cron/job.

### T06 — Auth Service (register, login, tokens)
**File:** `customers.service.ts`
**What:** Register (hash password, create customer), login (verify password, generate JWT), refresh, logout, password reset (stub email).
**Acceptance:** JWT contains `customerId` and `tenantId`. Refresh token stored hashed.

### T07 — Google OAuth
**File:** `customers.service.ts`
**What:** Accept Supabase OAuth token, find-or-create customer, link `supabase_auth_id`.
**Acceptance:** Existing email user linked. New user created.

### T08 — Cart Merge Logic
**File:** `customers.service.ts`
**What:** On login, if guest session has a cart, merge items into customer's cart (or adopt the cart).
**Acceptance:** Guest cart items appear in customer's cart after login. Redis lock prevents double merge.

### T09 — Auth Middleware
**File:** `src/middleware/auth.middleware.ts`
**What:** Validate JWT from `Authorization: Bearer` header. Set `ctx.customer`. Support optional mode for guest endpoints.
**Acceptance:** Valid token → `ctx.customer` set. Expired → 401. Missing + optional → proceed as guest.

### T10 — Routes
**File:** `customers.routes.ts`
**What:** All auth + profile + address endpoints per API contracts.
**Acceptance:** All endpoints return correct status codes. Unauthorized requests → 401.

### T11 — Unit Tests
**File:** `customers.test.ts`
**What:** Test: registration, login, tenant isolation (same email different tenants), address default toggling, guest session creation, soft delete blocks login.
**Acceptance:** All tests pass.

## Integration Test

1. Register customer on tenant A
2. Register same email on tenant B — succeeds
3. Login on tenant A — JWT returned
4. Access profile — correct data
5. Create 3 addresses, set #2 as default shipping — #1 loses default
6. Create guest session → add items to cart → login → cart merged
7. Soft delete customer → login returns 401

## Edge Case Checklist

- [ ] Duplicate email same tenant → 409
- [ ] Same email different tenant → success
- [ ] Password < 8 chars → 400
- [ ] 11th address → 400
- [ ] Expired JWT → 401
- [ ] Expired refresh token → 401
- [ ] Google OAuth with existing email → accounts linked
- [ ] Soft-deleted customer login → 401

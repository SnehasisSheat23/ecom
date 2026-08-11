# PRD-M02 — Auth & Customers

**Layer:** Core | **Phase:** 1 | **Estimate:** 2 days
**Depends on:** M01 (tenant context)
**Required by:** M06 (cart auth), M07 (order customer), M12 (loyalty customer)
**Source:** `src/modules/customers/`

---

## Context

Every e-commerce action requires identity — either an authenticated customer or a guest session. This module handles registration, login, JWT management, guest sessions, customer profiles, and address books. It integrates with Supabase Auth (GoTrue) for authentication while keeping customer profiles in our own database for tenant isolation.

This module also provides the authenticated actor shape consumed by vendor-aware modules. A customer may belong to zero, one, or many vendors within the same tenant. Authentication must therefore expose vendor memberships and one explicit active vendor context for vendor-scoped actions.

## V1 Scope

### Authentication
- Email + password registration (bcrypt, min 12 rounds)
- Email + password login → returns JWT access token + refresh token
- Google OAuth via Supabase Auth
- JWT access tokens: 15-minute TTL
- Refresh tokens: 30-day TTL, httpOnly cookie
- Token refresh endpoint
- Logout (invalidate refresh token)
- Password reset via email OTP (email stub in v1, real via M10)
- Email verification on signup (stub in v1, real via M10)

### Guest Sessions
- UUID-based session created on first request (no auth header)
- Stored in `guest_sessions` table
- Linked to cart
- Merged into customer account on login/register

### Customer Profile
- Fields: `first_name, last_name, email, phone, avatar_url`
- Tenant-scoped: same email can register independently across tenants
- `is_admin` is tenant-scoped because it lives on the tenant-scoped customer row
- Soft delete: `deleted_at` (never hard delete — orders reference customers)
- Profile CRUD endpoints
- Auth response shape must include `vendorMemberships` and `activeVendorId`
- `activeVendorId` may be `null` for normal customers and tenant admins

### Vendor-Aware Auth Context
- A customer can be a member of multiple vendors in the same tenant
- Memberships are sourced from M14 `vendor_members`, not duplicated onto the customer row
- JWT/auth middleware must hydrate:
  - `vendorMemberships[]` for visibility
  - `activeVendorId` for scoped vendor actions
- Vendor-scoped actions in downstream modules must rely on `activeVendorId`, not infer vendor scope from arbitrary request body fields

### Address Book
- Multiple addresses per customer
- Fields: `line1, line2, city, state, postal_code, country, phone, label`
- Flags: `is_default_shipping, is_default_billing`
- Max 10 addresses per customer
- Address CRUD endpoints

## Out of Scope (do not build in v1)

- Social login beyond Google (Apple, Facebook)
- Two-factor authentication (2FA)
- Customer account deletion (GDPR) — schema hook present
- Loyalty tiers (Silver/Gold/Platinum) — schema hook present
- Customer groups / segments
- Admin impersonation of customer accounts

## Schema

```typescript
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  supabaseAuthId: varchar('supabase_auth_id', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

  // Schema hooks
  gdprDeletionRequestedAt: timestamp('gdpr_deletion_requested_at', { withTimezone: true }),
  tierId: uuid('tier_id'),

  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  label: varchar('label', { length: 50 }),
  line1: varchar('line1', { length: 255 }).notNull(),
  line2: varchar('line2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  country: varchar('country', { length: 2 }).notNull().default('IN'),
  phone: varchar('phone', { length: 20 }),
  isDefaultShipping: boolean('is_default_shipping').notNull().default(false),
  isDefaultBilling: boolean('is_default_billing').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const guestSessions = pgTable('guest_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  cartId: uuid('cart_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

## API Contracts

### Public Endpoints

```
POST   /auth/register         — Register with email + password
POST   /auth/login            — Login → JWT + refresh token cookie
POST   /auth/refresh          — Refresh access token
POST   /auth/logout           — Invalidate refresh token
POST   /auth/password/reset   — Request password reset OTP
POST   /auth/password/confirm — Confirm reset with OTP + new password
POST   /auth/google           — Google OAuth callback
```

### Authenticated Endpoints

```
GET    /me                    — Get current customer profile
PATCH  /me                    — Update profile
GET    /me/addresses          — List addresses
POST   /me/addresses          — Create address
PATCH  /me/addresses/:id      — Update address
DELETE /me/addresses/:id      — Delete address
GET    /me/vendor-memberships — Get vendor memberships for this tenant
POST   /me/active-vendor      — Set active vendor context for vendor-scoped actions
```

## Business Logic Rules

1. Same email can register across different tenants independently
2. Password minimum 8 characters, bcrypt with 12 rounds minimum
3. Setting `is_default_shipping = true` on one address unsets it on all others for that customer
4. Same rule for `is_default_billing`
5. Max 10 addresses per customer — return 400 if exceeded
6. Guest session expires after 30 days of inactivity
7. On login/register: if guest session exists with a cart, merge cart items into customer's existing cart
8. Soft-deleted customers cannot login — return 401 with generic message
9. Email verification is required before first order (enforced in M07)
10. `vendorMemberships` must be tenant-scoped and reflect only active memberships for the current tenant
11. `activeVendorId` must be either `null` or one of the authenticated customer's memberships for the current tenant
12. For `SINGLE_VENDOR` tenants, `activeVendorId` should normally remain `null` unless the tenant is explicitly using vendor-linked staff flows
13. Tenant-admin must come from tenant-scoped persisted data, not a global env-based email allowlist

## Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Register with existing email (same tenant) | 409 Conflict |
| Register with existing email (different tenant) | Success — independent accounts |
| Login with wrong password | 401, generic "invalid credentials" (no email enumeration) |
| Refresh with expired token | 401, client must re-login |
| Delete last address | Allowed — shipping address required at checkout, not before |
| Google OAuth for existing email user | Link accounts (same customer, add supabase_auth_id) |
| Guest session expired | Create new guest session transparently |
| User selects vendor they do not belong to | 403 Forbidden |
| Membership exists but vendor is suspended | Exclude from selectable active vendor contexts |

## Cross-Module Interactions

| Direction | Module | What |
|-----------|--------|------|
| **Reads** | M01 | TenantContext for tenant-scoped queries |
| **Provides** | M03, M04, M14 | Authenticated actor with `vendorMemberships` + `activeVendorId` |
| **Called by** | M06 | Cart merge on login |
| **Called by** | M07 | Customer lookup for order creation |
| **Called by** | M12 | Customer lookup for loyalty balance |
| **Emits** | M10 | `auth.welcome`, `auth.email_verify`, `auth.password_reset` (stubbed to console.log until M10) |

## Schema Hooks

| Column | Purpose | Activate When |
|--------|---------|---------------|
| `gdpr_deletion_requested_at` | GDPR right-to-erasure flow | Privacy compliance |
| `tier_id` | Loyalty tier (Silver/Gold/Platinum) | Loyalty tiers feature |

## Acceptance Criteria

- [ ] Customer can register, login, logout
- [ ] Guest session created on first unauthenticated request
- [ ] JWT middleware correctly validates tokens and rejects expired ones
- [ ] Token refresh works with httpOnly cookie
- [ ] Address CRUD works (create, read, update, delete)
- [ ] Default shipping/billing flags correctly toggle (only one true at a time)
- [ ] Max 10 addresses enforced
- [ ] Tenant isolation: same email registers independently across two tenants
- [ ] Soft-deleted customer cannot login
- [ ] Google OAuth links to existing email account
- [ ] Auth middleware hydrates `vendorMemberships` and `activeVendorId` for authenticated requests
- [ ] Setting active vendor rejects vendors outside the caller's memberships

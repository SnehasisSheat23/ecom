# DESIGN-M02 — Auth & Customers

## File Map

| File | Purpose | Imports |
|------|---------|---------|
| `customers.schema.ts` | Drizzle tables: `customers`, `addresses`, `guest_sessions` | `drizzle-orm/pg-core`, `tenancy.schema` |
| `customers.types.ts` | Customer, Address, GuestSession interfaces | — |
| `customers.validators.ts` | Zod: register, login, profile update, address CRUD | `zod` |
| `customers.repository.ts` | DB queries: customer CRUD, address CRUD, guest sessions | `customers.schema`, `db` |
| `customers.service.ts` | Auth logic: register, login, token management, profile, merge | `customers.repository` |
| `customers.routes.ts` | Auth + profile endpoints | `customers.service`, `customers.validators` |
| `customers.test.ts` | Tests: auth flows, tenant isolation, address rules | `customers.service` |

### Middleware Created by This Module

| File | Purpose |
|------|---------|
| `src/middleware/auth.middleware.ts` | Validates JWT, sets `ctx.customer`. Optional mode for guest-allowed endpoints. |

## Auth Context Contract

M02 owns the authenticated actor shape consumed by vendor-aware modules. The auth layer must support:
- normal customers with no vendor memberships
- tenant admins and super admins
- vendor-linked users who may belong to multiple vendors within the same tenant

The auth middleware must therefore hydrate both `vendorMemberships` and a single explicit `activeVendorId` for vendor-scoped actions.

## Database Schema (DDL)

```sql
CREATE TABLE customers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id),
  supabase_auth_id            VARCHAR(255),
  email                       VARCHAR(255) NOT NULL,
  password_hash               VARCHAR(255),
  first_name                  VARCHAR(100),
  last_name                   VARCHAR(100),
  phone                       VARCHAR(20),
  avatar_url                  VARCHAR(500),
  email_verified_at           TIMESTAMPTZ,
  last_login_at               TIMESTAMPTZ,
  gdpr_deletion_requested_at  TIMESTAMPTZ,
  tier_id                     UUID,
  deleted_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_email_tenant UNIQUE (tenant_id, email)
);

CREATE TABLE addresses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  customer_id         UUID NOT NULL REFERENCES customers(id),
  label               VARCHAR(50),
  line1               VARCHAR(255) NOT NULL,
  line2               VARCHAR(255),
  city                VARCHAR(100) NOT NULL,
  state               VARCHAR(100) NOT NULL,
  postal_code         VARCHAR(20) NOT NULL,
  country             VARCHAR(2) NOT NULL DEFAULT 'IN',
  phone               VARCHAR(20),
  is_default_shipping BOOLEAN NOT NULL DEFAULT false,
  is_default_billing  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guest_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  cart_id     UUID,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_supabase_auth ON customers(supabase_auth_id) WHERE supabase_auth_id IS NOT NULL;
CREATE INDEX idx_addresses_customer ON addresses(tenant_id, customer_id);
CREATE INDEX idx_guest_sessions_expires ON guest_sessions(expires_at);

-- Application-level tenant filtering
-- Every tenant-scoped repository query must include tenant_id in the predicate.
```

## Service Interface

```typescript
class CustomerService {
  async register(data: RegisterInput, tenantId: string): Promise<{ customer: Customer; accessToken: string; refreshToken: string }>
  async login(email: string, password: string, tenantId: string): Promise<{ customer: Customer; accessToken: string; refreshToken: string }>
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }>
  async logout(refreshToken: string): Promise<void>
  async requestPasswordReset(email: string, tenantId: string): Promise<void>
  async confirmPasswordReset(email: string, otp: string, newPassword: string, tenantId: string): Promise<void>
  async googleOAuth(supabaseToken: string, tenantId: string): Promise<{ customer: Customer; accessToken: string; refreshToken: string }>
  async getProfile(customerId: string): Promise<Customer>
  async updateProfile(customerId: string, data: UpdateProfileInput): Promise<Customer>
  async createGuestSession(tenantId: string): Promise<GuestSession>
  async mergeGuestToCustomer(guestSessionId: string, customerId: string): Promise<void>
  async getAuthContext(customerId: string, tenantId: string): Promise<AuthenticatedCustomer>
  async setActiveVendor(customerId: string, tenantId: string, vendorId: string | null): Promise<AuthenticatedCustomer>
}

class AddressService {
  async list(customerId: string): Promise<Address[]>
  async create(customerId: string, data: CreateAddressInput): Promise<Address>
  async update(addressId: string, customerId: string, data: UpdateAddressInput): Promise<Address>
  async delete(addressId: string, customerId: string): Promise<void>
}
```

## Repository Interface

```typescript
class CustomerRepository {
  async findByEmail(tenantId: string, email: string): Promise<Customer | null>
  async findById(id: string): Promise<Customer | null>
  async findBySupabaseId(supabaseAuthId: string): Promise<Customer | null>
  async create(data: InsertCustomer): Promise<Customer>
  async update(id: string, data: Partial<InsertCustomer>): Promise<Customer>
  async softDelete(id: string): Promise<void>
  async listVendorMemberships(customerId: string, tenantId: string): Promise<Array<{
    vendorId: string
    role: 'owner' | 'manager' | 'staff'
    status: 'onboarding' | 'active' | 'suspended'
  }>>
}

class AddressRepository {
  async findByCustomer(customerId: string): Promise<Address[]>
  async findById(id: string, customerId: string): Promise<Address | null>
  async create(data: InsertAddress): Promise<Address>
  async update(id: string, data: Partial<InsertAddress>): Promise<Address>
  async delete(id: string): Promise<void>
  async countByCustomer(customerId: string): Promise<number>
  async clearDefaultShipping(customerId: string): Promise<void>
  async clearDefaultBilling(customerId: string): Promise<void>
}

class GuestSessionRepository {
  async create(tenantId: string, expiresAt: Date): Promise<GuestSession>
  async findById(id: string): Promise<GuestSession | null>
  async linkCart(sessionId: string, cartId: string): Promise<void>
  async delete(id: string): Promise<void>
  async deleteExpired(): Promise<number>
}
```

## Environment Variables Used

| Variable | Purpose |
|----------|---------|
| `AUTH_URL` | Supabase Auth / GoTrue endpoint |
| `AUTH_ANON_KEY` | Supabase anon key for OAuth |
| `AUTH_SERVICE_KEY` | Supabase service key for admin ops |
| `APP_SECRET` | JWT signing key |

## Known Gotchas

1. **Unique email per tenant, not globally.** The unique constraint is `(tenant_id, email)`, not just `email`. Same person can have different accounts on different stores.

2. **Cart merge race condition.** When two tabs login simultaneously, cart merge could execute twice. Use a Redis lock on `merge:{guestSessionId}` for 10 seconds.

3. **bcrypt timing attack.** Always run bcrypt hash comparison even if user not found (compare against a dummy hash) to prevent email enumeration via timing.

4. **Refresh token storage.** Store refresh tokens hashed (SHA-256) in DB. On refresh, hash the incoming token and compare. Never store raw.

5. **Supabase Auth vs. own JWT.** Supabase handles OAuth. For email/password, we generate our own JWTs. Both paths converge on the same customer record.

6. **Vendor memberships are not stored on `customers`.** Vendor relationships come from M14 `vendor_members`; M02 must join or query them when building `AuthenticatedCustomer`.

7. **Active vendor is explicit.** For vendor-linked users, downstream write access must be scoped by `activeVendorId`, not by a single legacy `vendorId` field on the customer record.

8. **Suspended vendor memberships.** Membership rows linked to suspended vendors must not be treated as active vendor scope for mutation endpoints.

9. **Tenant-admin is per tenant, not global.** `customers.is_admin` is safe because each customer row is already scoped by `tenant_id`. Never derive tenant-admin from a global env var.

# DESIGN-M14 — Vendors

## File Map

| File                   | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `vendor.schema.ts`     | `vendors`, `vendor_members`, `vendor_ledger` tables |
| `vendor.repository.ts` | Ledger and profile management                       |
| `vendor.service.ts`    | Order splitting, payout logic, balance calculation  |
| `vendor.routes.ts`     | Vendor dashboard and admin management endpoints     |

## Database Schema (DDL)

```sql
CREATE TYPE vendor_status AS ENUM ('onboarding', 'active', 'suspended');

CREATE TABLE vendors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  status            vendor_status NOT NULL DEFAULT 'onboarding',
  email             VARCHAR(255),
  phone             VARCHAR(20),
  description       TEXT,
  logo_url          VARCHAR(500),
  commission_rate   DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- 10% platform fee
  bank_details      JSONB,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vendor_slug_tenant UNIQUE (tenant_id, slug)
);

CREATE TABLE vendor_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  vendor_id   UUID NOT NULL REFERENCES vendors(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  role        VARCHAR(20) NOT NULL DEFAULT 'staff', -- 'owner', 'manager', 'staff'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, customer_id)
);

-- Maps each order item to its vendor-specific sub-order.
CREATE TABLE order_sub_order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  sub_order_id  UUID NOT NULL REFERENCES order_sub_orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  vendor_id     UUID NOT NULL REFERENCES vendors(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sub_order_id, order_item_id),
  UNIQUE (tenant_id, order_item_id)
);

-- Append-only financial ledger
CREATE TABLE vendor_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id),
  order_id        UUID REFERENCES orders(id),
  sub_order_id    UUID,
  idempotency_key VARCHAR(150) NOT NULL,
  type            VARCHAR(20) NOT NULL, -- 'SALE', 'FEE', 'PAYOUT', 'REFUND'
  amount          INTEGER NOT NULL,      -- positive for credit, negative for debit
  description     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX idx_vendor_members_customer ON vendor_members(customer_id);
CREATE INDEX idx_vendor_ledger_vendor ON vendor_ledger(vendor_id, created_at DESC);
```

## Service Interface

```typescript
interface ActorContext {
  tenantId: string;
  customerId: string;
  role: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'VENDOR_STAFF';
  vendorMemberships?: Array<{
    vendorId: string;
    memberRole: 'owner' | 'manager' | 'staff';
    status: 'onboarding' | 'active' | 'suspended';
  }>;
  activeVendorId?: string; // Required for vendor-scoped writes when role is VENDOR_STAFF
}

class VendorService {
  /**
   * Orchestrates sub-order creation on order.created event.
   * Calculates commission and populates vendor_ledger for the sale.
   */
  async handleOrderCreated(orderId: string, tenantId: string): Promise<void>

  /**
   * Calculates current balance by summing ledger entries.
   * R13: Never cache this in a column.
   */
  async getBalance(vendorId: string, tenantId: string): Promise<number>

  /**
   * Records a manual payout. Adds a debit entry to the ledger.
   */
  async recordPayout(vendorId: string, amount: number, ctx: ActorContext): Promise<void>

  /**
   * Authorizes access based on the 3-tier model.
   * Used as a guard in controllers.
   */
  async authorizeVendorAccess(vendorId: string, ctx: ActorContext): Promise<void>

  /**
   * Returns all vendors the caller belongs to within the tenant.
   * Used by the vendor switcher and dashboard bootstrapping.
   */
  status: 'onboarding' | 'active' | 'suspended'
}

  /**
   * Orchestrates registration of a new customer AND their vendor profile in one transaction.
   * Status defaults to 'onboarding'. Returns AuthResult with tokens.
   */
  async onboardNewVendor(
    tenantId: string,
    registration: RegisterInput,
    vendorInput: CreateVendorInput,
    customers: CustomersService
  ): Promise<AuthResult & { vendor: Vendor }>

  /**
   * Allows an existing customer to apply for vendor status.
   * Status defaults to 'onboarding' and requires Admin approval.
   */
  async applyForVendor(tenantId: string, input: CreateVendorInput, actor: AuthenticatedCustomer): Promise<Vendor>
}
```

## Route Contracts

```text
POST   /admin/vendors                          -- Create vendor in tenant
GET    /admin/vendors?status=onboarding        -- List tenant vendors (optional status filter)
GET    /admin/vendors/:vendorId                -- Get vendor profile + membership summary
PATCH  /admin/vendors/:vendorId                -- Update vendor profile/status/commission
DELETE /admin/vendors/:vendorId                -- Soft delete vendor

POST   /admin/vendors/:vendorId/members        -- Add customer membership to vendor
DELETE /admin/vendors/:vendorId/members/:customerId -- Revoke membership
GET    /me/vendors                             -- List caller's vendor memberships in tenant
POST   /me/vendors/active                      -- Set active vendor context for subsequent vendor-scoped actions
POST   /vendors/register                       -- Public: Register as new user and create vendor (status: onboarding)
POST   /vendors/apply                          -- Auth: Existing customer applies for vendor status (status: onboarding)

GET    /vendor/sub-orders                      -- List sub-orders for active vendor
GET    /vendor/sub-orders/:subOrderId          -- Get one sub-order for active vendor
PATCH  /vendor/sub-orders/:subOrderId          -- Update status/tracking for active vendor

GET    /admin/vendors/:vendorId/ledger         -- Tenant admin ledger view
POST   /admin/vendors/:vendorId/payouts        -- Record manual payout
GET    /vendor/ledger                          -- Active vendor ledger view
```

### Route Notes

- `/me/vendors/active` must validate that the requested vendor belongs to the caller in the same tenant and that the vendor is `active`.
- Vendor-scoped routes must read `activeVendorId` from auth context, not from arbitrary body parameters.
- Tenant admins and super admins may inspect any vendor in the tenant without using active vendor context.

## Authorization Logic

- **Super Admin**: Bypasses all `vendor_id` checks.
- **Tenant Admin**: Accesses all `vendor_id` within their `tenant_id`.
- **Vendor Member**: May belong to multiple vendors in the same tenant via `vendor_members`.
- **Vendor Member**: Reads may list only vendors present in `ctx.vendorMemberships`.
- **Vendor Member**: Writes must include one explicit `activeVendorId`, and access is allowed only when `resource.vendor_id === ctx.activeVendorId`.
- **Vendor Member**: Must never switch or infer vendor scope implicitly from request payload alone.

## Sub-Order Model

- `order_sub_orders` remains the vendor-level fulfillment aggregate defined by M07.
- `order_sub_order_items` is required so each `order_item` is deterministically assigned to exactly one vendor sub-order.
- The vendor service groups `OrderCreatedEvent.items` by `vendorId`, creates one `order_sub_orders` row per vendor, then inserts the item mappings into `order_sub_order_items`.
- Items where `vendorId` is `null` are platform-owned and skipped by the vendor splitting flow.

## Ledger Model

- The vendor ledger is vendor-facing and append-only.
- V1 `SALE` rows store net vendor earnings after subtracting platform commission.
- `metadata` must preserve the gross line total, applied commission rate, commission amount, and source event identifiers for auditability.
- `PAYOUT` rows are negative debits recorded by tenant admins or super admins.
- `REFUND` rows reverse the vendor's prior net earnings for the refunded scope.
- Every ledger write must include a deterministic `idempotency_key`, for example `sale:{subOrderId}` or `refund:{refundId}:{subOrderId}`.

## Known Gotchas

1. **Commission Calculation**: Subtract platform fee from the gross vendor subtotal before crediting the vendor ledger, and store the fee breakdown in metadata.
2. **Refunds**: A refund must be idempotent and reverse only the net vendor earnings tied to the affected sub-order or items.
3. **Soft Deletes**: When a vendor is removed, revoke all `vendor_members` access but preserve the `vendors` row for historical orders.
4. **Multi-membership**: Do not rely on a single `vendorId` in auth context; vendor scope must be explicitly selected per action.

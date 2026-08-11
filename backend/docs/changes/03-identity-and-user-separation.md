# Phase 3: Identity & User Separation

## Goal
Cleanly separate **Platform/Store Operations Users** (`users` table for Tenant Admins, Vendor Staff, and SaaS Operators) from **Storefront Shoppers** (`customers` table for End-user Buyers), replacing hardcoded environment-variable SuperAdmins with a database role (`PLATFORM_ADMIN`), and adding a future-proof permissions column.

---

## Schema Architecture

```
┌────────────────────────────────────────────────────────┐
│   users (Platform Operators: Admins & Vendors)        │
│   id, tenantId, email, passwordHash, firstName, etc.   │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│  user_roles             │  │  vendor_members         │
│  userId, tenantId       │  │  userId, vendorId       │
│  role: 'PLATFORM_ADMIN' │  │  role: owner|manager    │
│      | 'TENANT_ADMIN'   │  │  permissions: jsonb     │
│      | 'VENDOR_STAFF'   │  └─────────────────────────┘
│  permissions: jsonb     │
└─────────────────────────┘

┌────────────────────────────────────────────────────────┐
│   customers (Storefront Shoppers / End-user Buyers)    │
│   id, tenantId, email, phone, passwordHash, etc.       │
└────────────────────────────────────────────────────────┘
```

---

## Key Schema Definitions

### 1. `src/modules/users/users.schema.ts` (Platform Users)

```typescript
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id), // Nullable for global PLATFORM_ADMIN
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phone: varchar('phone', { length: 20 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_users_tenant_email').on(table.tenantId, table.email),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id), // Nullable for global PLATFORM_ADMIN
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 30 })
      .$type<'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'VENDOR_STAFF'>()
      .notNull(),
    permissions: jsonb('permissions').$type<string[] | null>().default(null), // Future-proof granular overrides
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_user_roles').on(table.tenantId, table.userId, table.role),
  ],
)
```

### 2. Update to `vendor_members` Table (`src/layers/vendor/vendor.schema.ts`)

```typescript
export const vendorMembers = pgTable(
  'vendor_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    vendorId: uuid('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).$type<'owner' | 'manager' | 'staff'>().notNull().default('staff'),
    permissions: jsonb('permissions').$type<string[] | null>().default(null), // Future-proof granular overrides
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_vendor_member_tenant_vendor_user').on(
      table.tenantId,
      table.vendorId,
      table.userId,
    ),
    index('idx_vendor_members_user').on(table.userId),
  ],
)
```

---

## Future-Proof Granular Permissions (Zero Latency Overhead)

### Design Philosophy
- **Today (`permissions = NULL`)**: Uses default role behavior (`TENANT_ADMIN` = full access, Vendor `owner` = full vendor access).
- **Future (`permissions = ["catalog:write", "orders:read"]`)**: Allows store admins to grant custom fine-grained permissions to specific staff members.

### Zero Performance Penalty
1. **Zero Storage / Index Cost Today**: When `permissions = NULL`, PostgreSQL stores zero bytes.
2. **Zero Extra DB Queries**: The `permissions` array is fetched in the exact same single query that loads the user session during auth middleware execution.
3. **In-Memory Check**: Route guards check `session.user.permissions.includes('catalog:write')` in memory (microsecond execution, zero database calls).

---

## SuperAdmin Simplification (`PLATFORM_ADMIN`)

1. **Remove Hardcoded `SUPER_ADMIN_EMAIL` Env Check**:
   - Delete `isSuperAdminEmail()` from `src/lib/admin.ts` and remove `SUPER_ADMIN_EMAIL` from `.env`.
   - Remove messy `if (actor.isAdmin && !actor.isSuperAdmin)` boolean logic across 50+ files.

2. **Database-Driven `PLATFORM_ADMIN` Role**:
   - A SaaS operator gets `role = 'PLATFORM_ADMIN'` with `tenantId = NULL` in `user_roles`.
   - Allows multiple platform admins (not restricted to a single hardcoded email).

3. **Behavior in Standalone Mode (`DEPLOYMENT_MODE=standalone`)**:
   - In Standalone mode, the `PLATFORM_ADMIN` role is not used. The store's `TENANT_ADMIN` is the top-level authority.

---

## Role Guard Enforcement

1. **Platform SuperAdmin (SaaS Mode Only)**:
   - Middleware: `requireRole('PLATFORM_ADMIN')`.
2. **Tenant Admin**:
   - Check `user_roles` where `userId = session.userId` and `role = 'TENANT_ADMIN'`.
3. **Vendor Staff**:
   - Check `vendor_members` where `userId = session.userId` and `vendorId = targetVendorId`.

---

## Cleanup on `customers` Table

- Remove legacy `vendor_id` column from `customers`.
- Remove `is_admin` boolean flag from `customers` (handled cleanly by `user_roles`).

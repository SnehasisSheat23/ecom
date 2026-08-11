# Phase 5: Flexible Customer Auth Engine

## Goal
Implement a lightweight, **per-tenant configurable Customer Auth Engine** for storefront shoppers (`customers` table), allowing each marketplace tenant to customize how their customers log in (Email/Password, Phone+OTP, Social, Magic Link).

---

## Schema Design (`tenant_auth_config`)

```typescript
export const tenantAuthConfig = pgTable('tenant_auth_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id)
    .unique(),
  enableEmailPassword: boolean('enable_email_password').notNull().default(true),
  enablePhoneOtp: boolean('enable_phone_otp').notNull().default(false),
  enableGoogleOAuth: boolean('enable_google_oauth').notNull().default(false),
  enableMagicLink: boolean('enable_magic_link').notNull().default(false),
  primaryIdentifier: varchar('primary_identifier', { length: 20 })
    .$type<'email' | 'phone'>()
    .notNull()
    .default('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

---

## Customer Schema Flexibility (`customers`)

To support arbitrary tenant login methods, identification fields on `customers` are nullable:

```typescript
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  email: varchar('email', { length: 255 }), // Nullable if tenant uses Phone+OTP only
  phone: varchar('phone', { length: 20 }),   // Nullable if tenant uses Email only
  passwordHash: varchar('password_hash', { length: 255 }), // Nullable for OTP / OAuth
  googleId: varchar('google_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

---

## Auth Execution Strategy

```
Storefront Login Request
         │
         ▼
Read `tenant_auth_config` for current tenant
         │
 ┌───────┴─────────────────────────────┐
 │                                     │
 ▼                                     ▼
Allowed Method?                     Not Allowed?
 (e.g. Phone OTP)                    (Throw 400 'auth-method-disabled')
 │
 ▼
Execute method handler
(Issue Customer JWT / Session)
```

---

## Benefits

- Tenant A can run pure Email/Password.
- Tenant B can run pure Phone + OTP for local delivery shoppers.
- Tenant C can enable Google OAuth without requiring database structural changes.

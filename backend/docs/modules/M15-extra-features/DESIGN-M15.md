# DESIGN-M15 — Extra Features: Vendor Invitations

**Module ID:** M15 | **Phase:** 3 | **Estimate:** 1 day  
**Depends on:** M01, M02, M14  
**Source Path:** `src/modules/extra-features/`

---

## Schema

### `vendor_invitations`

```typescript
export const vendorInvitations = pgTable('vendor_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  vendorId: uuid('vendor_id').notNull().references(() => vendors.id),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  status: invitationStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

## API Contracts

### Admin Endpoints (requires Tenant Admin)

#### Invite Vendor
- **Path**: `POST /admin/vendors/:id/invitations`
- **Request Body**: `{ "email": string }`
- **Response**: `201 Created` with `{ "data": { "invitationId": string } }`
- **Internal Action**:
  - Validates that the vendor exists in this tenant.
  - Generates a cryptographically secure token.
  - Hashes it using SHA-256.
  - Saves the record.
  - Emits `vendor.invitation.created` event.

### Public Endpoints

#### Get Invitation Details
- **Path**: `GET /public/invitations/:token`
- **Response**: `200 OK` with `{ "data": { "shopName": string, "tenantName": string, "expiresAt": string } }`
- **Error**: `404 Not Found` if the token is invalid, used, or expired.

#### Accept Invitation
- **Path**: `POST /public/invitations/accept`
- **Request Body**: `{ "token": string, "password": string, "firstName": string, "lastName": string }`
- **Internal Action**:
  - Validates the token and finds the invitation.
  - In a transaction:
    - Creates a new `Customer`.
    - Creates a `VendorMember` mapping.
    - Marks the invitation as `accepted`.
  - Returns `201 Created` with `{ "data": { "customer": Customer, "accessToken": string } }`.

## Key Components

### 1. `ExtraFeaturesService`
- **`inviteVendorMember(tenantId, vendorId, email, actor)`**:
  - Permission check.
  - Token generation.
  - Persist invitation.
  - Trigger notification.
- **`acceptVendorInvitation(token, input)`**:
  - Verification logic.
  - Transaction orchestration.

### 2. `NotificationProvider` interface
A provider-agnostic interface to handle email delivery.
```typescript
export interface NotificationProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>
}
```

## Security Considerations

1.  **Token Hashing**: Tokens are never stored as plain text. This prevents "token leakage" from db dumps.
2.  **One-Time Use**: The `accepted_at` field and `status` check ensure a link is burned once used.
3.  **Tenant Scope**: All invitations are strictly bound to a `tenant_id`.
4.  **Rate Limiting**: Public endpoints will have strict rate limits to prevent token-guessing attacks.

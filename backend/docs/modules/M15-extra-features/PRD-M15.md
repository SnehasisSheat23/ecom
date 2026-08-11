# PRD-M15 — Extra Features: Vendor Invitations

**Module ID:** M15 | **Phase:** 3 | **Estimate:** 1 day  
**Depends on:** M01, M02, M14  
**Source Path:** `src/modules/extra-features/`

---

## Context

Currently, vendor onboarding is a manual, multi-step process involving the Tenant Admin creating a vendor and then manually linking a pre-registered customer. 

**M15 — Extra Features** introduces a professional **Vendor Invitation Flow**. This allows a Tenant Admin to "invite" a vendor via email. The vendor then clicks a secure link, sets their password, and is automatically linked to their shop in a single atomic step.

## V1 Scope (Invitation Flow)

### 1. Invitation Generation
- Tenant Admins can create an invitation for a specific email address and shop.
- System generates a cryptographically secure, one-time-use token.
- Token is stored as a SHA-256 hash in the database for security.

### 2. Email Delivery (Notification Context)
- The system emits a `vendor.invitation.created` event.
- A `NotificationProvider` (e.g., Resend) sends an email containing the invitation link.
- **Fallback**: In development, the link is logged to the console if no provider is configured.

### 3. Invitation link Verification
- A public route validates the token.
- Returns metadata about the invitation (Shop Name, Tenant Name, Expiry) so the UI can show a personalized greeting ("You've been invited to join Nike Store").

### 4. Atomic Account Creation
- The vendor user provides their name and password.
- In a single database transaction:
    - A `Customer` record is created.
    - A `VendorMember` record is created linking them to the shop.
    - The `Invitation` is marked as `accepted`.
    - Initial `AuthTokens` are issued.

## Business Logic Rules

1.  **Immutability**: Once an invitation is accepted or expired, it cannot be reused.
2.  **Expiry**: Invitations expire after **48 hours** by default.
3.  **Scoped Registration**: The registration triggered by an invitation automatically inherits the `tenant_id` of the inviter.
4.  **No Pre-Registration Required**: The vendor does *not* need to have a customer account before being invited.

## Acceptance Criteria

- [ ] Tenant Admin can trigger an invite via API.
- [ ] Invitation link is generated with a secure SHA-256 token.
- [ ] Clicking the link displays the correct shop metadata.
- [ ] Submitting the acceptance form creates a customer and a vendor membership.
- [ ] Token is invalidated immediately upon successful registration.
- [ ] Invitations are strictly scoped to the tenant that created them.

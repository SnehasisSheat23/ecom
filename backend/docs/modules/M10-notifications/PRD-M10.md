# PRD-M10 — Notifications

**Layer:** Core | **Phase:** 2 | **Estimate:** 1 day
**Depends on:** M01, M02, M14 (for vendor contact info)
**Required by:** M07 (orders), M11 (abandonment), M12 (loyalty)
**Source:** `src/modules/notifications/`

---

## Context
All transactional notifications (Email & WhatsApp) flow through this module. Uses provider-agnostic interfaces (CONTRACTS.md §6). Each tenant configures their own provider credentials. All sends are async jobs — never inline.

## V1 Scope
- **Multi-Channel**: Email (Resend) and WhatsApp (Twilio/Meta) support.
- **Tenant Configuration**: Securely store per-tenant provider API keys and "from" details.
- **Event-Driven Routing**: Define which actors (Customer, Vendor, Admin) receive notifications for each event.
- **9 Core Events**: order.confirmed, order.shipped, order.delivered, order.cancelled, cart.abandoned, auth.welcome, auth.email_verify, auth.password_reset, vendor.approved.
- **HTML & Text Templates**: Multi-channel templates per event per tenant (DB-stored with variable substitution).
- **Notification Log**: Tracks channel, recipient type, status, and provider response.

## Out of Scope
- Push notifications / Browser notifications.
- Customer unsubscribe preferences dashboard (V2).
- Marketing campaigns / Bulk messaging.

<!-- TODO: Expand template format, event payloads, DDL before Phase 2 -->

## Acceptance Criteria
- [ ] Place order → confirmation email received
- [ ] All 9 event types render correctly
- [ ] Failed notification lands in DLQ, doesn't crash main flow
- [ ] Notification log entry for every send attempt
- [ ] Retry policy is documented per notification event/job type
- [ ] Publish failures are logged with tenant and job identifiers
- [ ] Integration test covers enqueue → handler → provider send → notification log write

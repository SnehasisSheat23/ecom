# ADR-006: Payment Provider Abstraction

**Status:** Accepted
**Date:** 2026-03
**Modules affected:** M08 (payments), M07 (orders)

## Context

Different tenants may use different payment providers (Razorpay, Stripe, PayU). Providers differ in webhook payloads, signature verification, refund APIs, and idempotency support. Modules should not care which provider a tenant uses.

## Decision

All payment operations go through a `PaymentProvider` interface. Modules call `PaymentService` only — never provider SDKs directly. Provider resolution happens via `PaymentFactory` using tenant config.

## Alternatives Considered

**Direct SDK calls in modules:**
- ❌ Adding a new provider requires changing every file that touches payments
- ❌ Provider-specific error handling scattered across codebase
- ❌ Testing requires mocking each provider's SDK
- ✅ Simpler initial implementation

**Webhook-only (no server-side order creation):**
- ❌ Some providers require server-side order/session creation
- ❌ Less control over payment flow
- ✅ Less server-side code

## Consequences

- Adding a new provider = one new file implementing `PaymentProvider` + one line in factory switch
- Zero changes to any module when adding providers
- Webhook endpoint is per-provider per-tenant: `POST /webhooks/{provider}/{tenantId}`
- All webhook payloads normalized to `WebhookEvent` type before processing
- Idempotency enforced at the `payment_events` table level, not provider level
- See full interface specification in `docs/CONTRACTS.md` §3

# PRD-M08 — Payments

**Layer:** Core | **Phase:** 1 | **Estimate:** 2 days
**Depends on:** M01 (tenant payment config), M07 (orders/payment_intents)
**Required by:** — (but updates M07 order status)
**Source:** `src/modules/payments/`

> **Read MASTER-PRD Section 8 and CONTRACTS.md §3 in full before implementing.**

---

## Context
Payments connects orders to payment providers via a provider-agnostic abstraction layer. V1 supports Razorpay. Adding Stripe later requires zero module changes — only a new provider file. Webhook processing is idempotent via `payment_events` unique constraint.

## V1 Scope
- `PaymentProvider` interface (see `docs/CONTRACTS.md` §3)
- `RazorpayProvider` implementing the interface
- `PaymentFactory` — resolves provider from tenant config
- `PaymentService` — the ONLY interface modules call
- Webhook endpoint: `POST /webhooks/{provider}/{tenantId}`
- Full webhook flow: verify signature → parse → idempotency check → process → respond 200
- `StripeProvider` stub file (all methods throw `NotImplementedError`)
- Idempotency middleware (`src/lib/idempotency.ts`)
- Payment failure handling per MASTER-PRD §8.7

## Out of Scope
- Automated refund workflow (manual via admin in v1)
- Multi-currency payment processing
- Payment link generation
- Subscription payments

## API Contracts
```
POST   /payments/initiate            — Create provider order from payment_intent
POST   /webhooks/{provider}/{tenantId} — Webhook receiver
POST   /admin/payments/:intentId/refund — Manual refund trigger
GET    /admin/payments/:orderId      — Payment details for order
```

## Webhook Flow (from MASTER-PRD §8.5)
```
Provider → POST /webhooks/razorpay/{tenantId}
1. Resolve tenant
2. Verify signature → 401 if invalid
3. Parse payload → WebhookEvent
4. INSERT payment_events ON CONFLICT DO NOTHING → 0 rows = already processed → 200
5. BEGIN transaction:
   - Update payment_intent status
   - payment.captured → order PENDING→CONFIRMED + enqueue notification
   - payment.failed → payment_intent FAILED, order stays PENDING
   - payment.refunded → order CANCELLED (if full)
6. Return 200
```

## Business Logic Rules
1. Modules call `PaymentService` only — never `RazorpayProvider` directly
2. Adding a provider = 1 new file + 1 line in factory
3. `payment_events` is append-only (Rule R4) with unique `provider_event_id` (Rule R6)
4. Duplicate webhook = no-op (idempotent)
5. Failed payment leaves order as PENDING — customer can retry
6. All payment credentials from tenant config, never hardcoded
7. Webhook must return 200 quickly — async processing via the queue adapter if needed

## Acceptance Criteria
- [ ] Create order → initiate payment → Razorpay webhook → order CONFIRMED
- [ ] Duplicate webhook → no-op, order not double-confirmed
- [ ] Payment fails → order stays PENDING, customer can retry
- [ ] Invalid signature → 401
- [ ] All failure scenarios from MASTER-PRD §8.7 handled
- [ ] Stripe stub file exists and throws NotImplementedError
- [ ] If async webhook follow-up jobs are used, retry policy is documented per event type
- [ ] Publish failures for async follow-up jobs are logged with tenant and job identifiers
- [ ] Integration test covers the async follow-up path if webhook processing is split across queue delivery

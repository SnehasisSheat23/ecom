# TASKS-M08 — Payments

## Prerequisites
- [ ] M07 complete (orders/payment_intents)
- [ ] MASTER-PRD §8 read completely

## Tasks
### T01 — Schema: `payment_intents`, `payment_events` (if not already created by M07)
### T02 — PaymentProvider interface (`src/providers/payment/payment.interface.ts`)
### T03 — RazorpayProvider implementation
### T04 — StripeProvider stub (all methods throw NotImplementedError)
### T05 — PaymentFactory — resolve provider from tenant config
### T06 — PaymentService — initiatePayment, handleWebhook, initiateRefund
### T07 — Webhook route: `POST /webhooks/{provider}/{tenantId}`
### T08 — Idempotency middleware (`src/lib/idempotency.ts`)
### T08.1 — Document retry/idempotency rules for any async webhook follow-up jobs
### T08.2 — Add structured logging for queue publish failures
### T09 — Admin refund route
### T10 — Tests: full payment flow, duplicate webhook, failure handling, invalid signature

## Integration Test
1. Create order → initiate payment → get Razorpay order ID
2. Simulate Razorpay `payment.captured` webhook → order CONFIRMED
3. Send same webhook again → no-op
4. Simulate `payment.failed` → order stays PENDING
5. Simulate invalid signature → 401

## Edge Case Checklist
- [ ] Duplicate webhook → idempotent
- [ ] Payment for non-existent order → 404
- [ ] Webhook for wrong tenant → 401
- [ ] Partial refund amount validation

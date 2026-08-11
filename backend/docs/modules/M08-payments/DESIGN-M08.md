# DESIGN-M08 — Payments

## File Map
| File | Purpose |
|------|---------|
| `payments.schema.ts` | `payment_intents`, `payment_events` tables |
| `payments.service.ts` | `PaymentService` — sole interface modules call |
| `payments.routes.ts` | Payment initiation + webhook + admin refund |
| `src/providers/payment/payment.interface.ts` | `PaymentProvider` interface |
| `src/providers/payment/razorpay.provider.ts` | Razorpay implementation |
| `src/providers/payment/stripe.provider.ts` | Stripe stub |
| `src/providers/payment/payment.factory.ts` | Provider resolution from tenant config |
| `src/lib/idempotency.ts` | Upstash Redis-based idempotency key management |

## DDL
See MASTER-PRD §8.9 for full schema: `payment_intents`, `payment_events`, `tenant_payment_config`.

## Service Interface
```typescript
class PaymentService {
  async initiatePayment(orderId: string, tenant: TenantContext): Promise<{ providerOrderId: string; providerOrderToken: string }>
  async handleWebhook(rawBody: string, signature: string, tenant: TenantContext): Promise<void>
  async initiateRefund(paymentIntentId: string, amount: number, tenant: TenantContext): Promise<void>
  async createPaymentIntent(orderId: string, amount: number, tenant: TenantContext): Promise<string>
}
```

## Known Gotchas
1. **Webhook raw body.** Must parse the raw request body for signature verification — do not use parsed JSON. Hono's `c.req.text()` gives the raw body.
2. **Return 200 fast.** Providers timeout and retry if webhook response is slow. Do minimal processing inline, enqueue heavy work.
3. **Test mode vs live.** `tenant_payment_config.is_test_mode` determines whether to use test API keys. Test mode webhooks must still be verified.
4. **Split processing requires ownership.** If webhook handling is split into async follow-up jobs, document retry policy per event type and ensure duplicate delivery is safe.

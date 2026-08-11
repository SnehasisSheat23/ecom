import { z } from 'zod'

export const initiatePaymentSchema = z.object({
  paymentIntentId: z.uuid(),
  orderToken: z.uuid().optional(),
})

export const paymentIntentParamsSchema = z.object({
  intentId: z.uuid(),
})

export const paymentOrderParamsSchema = z.object({
  orderId: z.uuid(),
})

export const refundPaymentSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(255).default('manual_refund'),
  idempotencyKey: z.string().min(1).max(150).optional(),
})

export const paymentWebhookParamsSchema = z.object({
  provider: z.enum(['razorpay', 'stripe', 'payu']),
  tenantId: z.uuid(),
})

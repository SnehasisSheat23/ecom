import { Hono } from 'hono'

import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import type { PaymentsService } from './payments.service.js'
import {
  initiatePaymentSchema,
  paymentOrderParamsSchema,
  paymentWebhookParamsSchema,
  refundPaymentSchema,
} from './payments.validators.js'

export const createPaymentsRoutes = (service: PaymentsService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const optionalAuth = createAuthMiddleware(customersService, { optional: true })
  const authRequired = createAuthMiddleware(customersService)

  app.use('/payments/initiate', optionalAuth)
  app.use('/admin/payments/*', authRequired)

  app.post('/payments/initiate', async (c) => {
    const tenant = c.get('tenant')
    const customer = c.get('customer')
    const payload = initiatePaymentSchema.parse(await c.req.json())

    if (!customer && !payload.orderToken) {
      throw new AppError('Authentication or order token required', 401, 'authentication-required')
    }

    return c.json({
      data: await service.initiatePayment(
        tenant,
        payload,
        customer ? { customerId: customer.customerId } : undefined,
      ),
    })
  })

  app.post('/webhooks/:provider/:tenantId', async (c) => {
    const params = paymentWebhookParamsSchema.parse(c.req.param())
    const resolvedTenant = c.get('tenant')

    if (resolvedTenant.tenantId !== params.tenantId) {
      throw new AppError('Webhook tenant mismatch', 400, 'webhook-tenant-mismatch')
    }

    const rawBody = await c.req.text()
    const signature = c.req.header('x-razorpay-signature') ?? ''
    const webhookEventId = c.req.header('x-razorpay-event-id') ?? undefined

    await service.handleWebhook(params.tenantId, params.provider, rawBody, signature, webhookEventId)
    return c.json({ ok: true })
  })

  app.post('/admin/payments/:intentId/refund', async (c) => {
    if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const params = c.req.param()
    const payload = refundPaymentSchema.parse(await c.req.json())
    return c.json({
      data: await service.initiateRefund(c.get('tenant').tenantId, params.intentId, payload),
    })
  })

  app.get('/admin/payments/:orderId', async (c) => {
    if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    return c.json({
      data: await service.getPaymentDetails(c.get('tenant').tenantId, paymentOrderParamsSchema.parse(c.req.param()).orderId),
    })
  })

  // --- DEV-ONLY: Sandbox payment capture ---
  // Simulates a successful Razorpay payment.captured webhook
  // Triggers: order CONFIRMED, vendor sub-orders created, commission ledger entries
  app.post('/payments/sandbox/capture', optionalAuth, async (c) => {
    // Enabled for demo purposes as requested by user
    /* 
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Sandbox endpoints are disabled in production', 403, 'sandbox-disabled')
    }
    */

    const { paymentIntentId } = (await c.req.json()) as { paymentIntentId: string }
    if (!paymentIntentId) {
      throw new AppError('paymentIntentId is required', 400, 'missing-payment-intent-id')
    }

    const tenant = c.get('tenant')
    const sandboxEventId = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Directly process a simulated payment.captured event
    await service.handleSandboxCapture(tenant.tenantId, paymentIntentId, sandboxEventId)

    return c.json({ data: { ok: true, eventId: sandboxEventId } })
  })

  return app
}

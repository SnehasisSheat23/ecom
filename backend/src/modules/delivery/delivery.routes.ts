import { Hono } from 'hono'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import type { DeliveryService } from './delivery.service.js'
import { upsertPartnerDeliveryConfigSchema } from './delivery.validators.js'

export const createDeliveryRoutes = (service: DeliveryService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)

  // Webhook Endpoint (does not require standard customer authentication)
  app.post('/webhooks/shipping/:provider', async (c) => {
    const provider = c.req.param('provider')
    const tenantId = c.get('tenant').tenantId
    const payload = await c.req.json()

    // Collect headers as a flat record
    const headers: Record<string, string> = {}
    c.req.header && Object.keys(c.req.header()).forEach((key) => {
      headers[key.toLowerCase()] = c.req.header(key) || ''
    })

    try {
      await service.processWebhookUpdate(tenantId, provider, payload, headers)
      return c.json({ success: true }, 200)
    } catch (error: any) {
      // Return 200 to carrier webhook if it is a business logic miss to prevent retries,
      // but log it or handle appropriately
      if (error instanceof AppError && error.code === 'shipment-not-found') {
        return c.json({ success: false, error: error.message }, 200)
      }
      throw error
    }
  })

  // Secure endpoints for Vendor config management
  app.use('/vendor/delivery/*', authRequired)

  app.get('/vendor/delivery/config', async (c) => {
    const customer = c.get('customer')!
    const tenantId = c.get('tenant').tenantId
    const partnerId = customer.activePartnerId

    const config = await service.getActiveConfig(tenantId, partnerId)
    if (!config) {
      return c.json({ data: null })
    }

    // Mask credentials/tokens for security when returning config details
    const maskedCredentials = { ...config.credentials }
    if (maskedCredentials.apiKey) maskedCredentials.apiKey = '********'
    if (maskedCredentials.apiSecret) maskedCredentials.apiSecret = '********'
    if (maskedCredentials.authToken) maskedCredentials.authToken = '********'

    return c.json({
      data: {
        id: config.id,
        provider: config.provider,
        credentials: maskedCredentials,
        isActive: config.isActive
      }
    })
  })

  app.post('/vendor/delivery/config', async (c) => {
    const customer = c.get('customer')!
    const tenantId = c.get('tenant').tenantId
    const partnerId = customer.activePartnerId

    const payload = upsertPartnerDeliveryConfigSchema.parse(await c.req.json())

    const config = await service.upsertConfig(
      tenantId,
      partnerId,
      payload.provider,
      payload.credentials,
      payload.isActive
    )

    return c.json({
      data: {
        id: config.id,
        provider: config.provider,
        isActive: config.isActive
      }
    }, 201)
  })

  return app
}

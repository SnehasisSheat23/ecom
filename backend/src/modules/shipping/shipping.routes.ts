import { Hono } from 'hono'

import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js'
import type { ShippingService } from './shipping.service.js'
import {
  createShippingMethodSchema,
  createShippingZoneSchema,
  shippingEstimateQuerySchema,
  updateShippingMethodSchema,
  updateShippingZoneSchema,
} from './shipping.validators.js'

export const createShippingRoutes = (service: ShippingService) => {
  const app = new Hono<AppBindings>()
  const publicReadRateLimit = createRateLimitMiddleware({ limit: 120, windowMs: 60 * 1000 })

  const requireAdmin = (c: any) => {
    const isSuperAdmin = c.get('isSuperAdmin')
    const isAdmin = c.get('isAdmin')
    if (!isSuperAdmin && !isAdmin) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
  }

  app.get('/shipping/estimate', publicReadRateLimit, async (c) => {
    const query = shippingEstimateQuerySchema.parse(c.req.query())
    const options = await service.estimateFromQuery(c.get('tenant'), {
      addressId: query.address_id,
      subtotal: query.subtotal,
      isDigitalOnly: query.is_digital_only,
    })

    return c.json({ data: options })
  })

  // Admin Routes
  app.get('/admin/shipping/methods', async (c) => {
    requireAdmin(c)
    const methods = await service.listMethods(c.get('tenant').tenantId)
    return c.json({ data: methods })
  })

  app.post('/admin/shipping/methods', async (c) => {
    requireAdmin(c)
    const payload = createShippingMethodSchema.parse(await c.req.json())
    const method = await service.createMethod(c.get('tenant').tenantId, payload)
    return c.json({ data: method }, 201)
  })

  app.patch('/admin/shipping/methods/:id', async (c) => {
    requireAdmin(c)
    const payload = updateShippingMethodSchema.parse(await c.req.json())
    const method = await service.updateMethod(c.get('tenant').tenantId, c.req.param('id'), payload)
    return c.json({ data: method })
  })

  app.delete('/admin/shipping/methods/:id', async (c) => {
    requireAdmin(c)
    await service.deleteMethod(c.get('tenant').tenantId, c.req.param('id'))
    return c.json({ data: { ok: true } })
  })

  // Admin Zones
  app.get('/admin/shipping/zones', async (c) => {
    requireAdmin(c)
    const zones = await service.listZones(c.get('tenant').tenantId)
    return c.json({ data: zones })
  })

  app.post('/admin/shipping/zones', async (c) => {
    requireAdmin(c)
    const payload = createShippingZoneSchema.parse(await c.req.json())
    const zone = await service.createZone(c.get('tenant').tenantId, payload)
    return c.json({ data: zone }, 201)
  })

  app.patch('/admin/shipping/zones/:id', async (c) => {
    requireAdmin(c)
    const payload = updateShippingZoneSchema.parse(await c.req.json())
    const zone = await service.updateZone(c.get('tenant').tenantId, c.req.param('id'), payload)
    return c.json({ data: zone })
  })

  app.delete('/admin/shipping/zones/:id', async (c) => {
    requireAdmin(c)
    await service.deleteZone(c.get('tenant').tenantId, c.req.param('id'))
    return c.json({ data: { ok: true } })
  })

  return app
}

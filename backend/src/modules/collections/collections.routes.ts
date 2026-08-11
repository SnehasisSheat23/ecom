import { Hono } from 'hono'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import { CollectionsService } from './collections.service.js'
import {
  collectionQuerySchema,
  createCollectionSchema,
  updateCollectionSchema,
} from './collections.validators.js'

export const createCollectionsRoutes = (
  service: CollectionsService,
  customersService: CustomersService,
) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)
  const authOptional = createAuthMiddleware(customersService, { optional: true })



  // ─── Public Endpoints ──────────────────────────────────────────

  app.get('/collections', authOptional, async (c) => {
    const tenant = c.get('tenant')
    const query = c.req.query()
    const filters = collectionQuerySchema.parse(query)
    const list = await service.listCollections(tenant.tenantId, filters)
    return c.json({ data: list })
  })

  app.get('/collections/:slug', authOptional, async (c) => {
    const tenant = c.get('tenant')
    const collection = await service.getCollectionBySlug(tenant.tenantId, c.req.param('slug'))
    if (!collection) {
      throw new AppError('Collection not found', 404, 'collection-not-found')
    }
    return c.json({ data: collection })
  })

  // ─── Admin Endpoints ──────────────────────────────────────────

  app.post('/admin/collections', async (c) => {
    const actor = c.get('customer')
    const tenant = c.get('tenant')
    const body = await c.req.json()
    const input = createCollectionSchema.parse(body)

    const collection = await service.createCollection(
      tenant.tenantId,
      input,
      actor
        ? {
            userId: actor.customerId,
            tenantId: tenant.tenantId,
            isAdmin: actor.isAdmin,
            isSuperAdmin: actor.isSuperAdmin,
          }
        : undefined,
    )
    return c.json({ data: collection }, 201)
  })

  app.patch('/admin/collections/:id', async (c) => {
    const actor = c.get('customer')
    const tenant = c.get('tenant')
    const body = await c.req.json()
    const input = updateCollectionSchema.parse(body)

    const collection = await service.updateCollection(
      tenant.tenantId,
      c.req.param('id'),
      input,
      actor
        ? {
            userId: actor.customerId,
            tenantId: tenant.tenantId,
            isAdmin: actor.isAdmin,
            isSuperAdmin: actor.isSuperAdmin,
          }
        : undefined,
    )
    return c.json({ data: collection })
  })

  app.delete('/admin/collections/:id', async (c) => {
    const actor = c.get('customer')
    const tenant = c.get('tenant')

    await service.deleteCollection(
      tenant.tenantId,
      c.req.param('id'),
      actor
        ? {
            userId: actor.customerId,
            tenantId: tenant.tenantId,
            isAdmin: actor.isAdmin,
            isSuperAdmin: actor.isSuperAdmin,
          }
        : undefined,
    )
    return c.json({ success: true })
  })

  return app
}

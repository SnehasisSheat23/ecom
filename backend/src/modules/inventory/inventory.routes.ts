import { Hono } from 'hono'

import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import type { InventoryService } from './inventory.service.js'
import {
  adjustInventorySchema,
  inventoryReleaseJobPayloadSchema,
  inventoryVariantParamsSchema,
  listInventoryHistoryQuerySchema,
  listInventoryQuerySchema,
} from './inventory.validators.js'

export const createInventoryRoutes = (service: InventoryService) => {
  const app = new Hono<AppBindings>()

  const requireInventoryAccess = (
    isAdmin?: boolean,
    isSuperAdmin?: boolean,
    activePartnerId?: string | null,
  ) => {
    if (!isAdmin && !isSuperAdmin && !activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
  }

  app.get('/admin/inventory', async (c) => {
    requireInventoryAccess(c.get('isAdmin'), c.get('isSuperAdmin'), c.get('customer')?.activePartnerId)
    const query = listInventoryQuerySchema.parse(c.req.query())
    return c.json({
      data: await service.listInventory(c.get('tenant').tenantId, query, c.get('customer')),
    })
  })

  app.patch('/admin/inventory/:variantId', async (c) => {
    requireInventoryAccess(c.get('isAdmin'), c.get('isSuperAdmin'), c.get('customer')?.activePartnerId)
    const params = inventoryVariantParamsSchema.parse(c.req.param())
    const payload = adjustInventorySchema.parse(await c.req.json())
    return c.json({
      data: await service.adjustStock(
        params.variantId,
        payload,
        c.get('tenant').tenantId,
        c.get('customer'),
      ),
    })
  })

  app.get('/admin/inventory/:variantId/history', async (c) => {
    requireInventoryAccess(c.get('isAdmin'), c.get('isSuperAdmin'), c.get('customer')?.activePartnerId)
    const params = inventoryVariantParamsSchema.parse(c.req.param())
    const query = listInventoryHistoryQuerySchema.parse(c.req.query())
    return c.json({
      data: await service.listHistory(
        params.variantId,
        c.get('tenant').tenantId,
        query,
        c.get('customer'),
      ),
    })
  })

  app.post('/internal/jobs/inventory/release', async (c) => {
    const payload = inventoryReleaseJobPayloadSchema.parse(await c.req.json())
    await service.handleScheduledRelease(payload)
    return c.json({ ok: true })
  })

  return app
}

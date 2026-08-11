import { Hono } from 'hono'

import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import type { ActivityLogService } from './activity-log.service.js'
import type { ActivityEntityType } from './activity-log.types.js'
import {
  actorParamsSchema,
  entityParamsSchema,
  recordActivityLogSchema,
} from './activity-log.validators.js'

export const createActivityLogRoutes = (
  service: ActivityLogService,
  customersService: CustomersService
) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)
  const rateLimit = createRateLimitMiddleware({ limit: 60, windowMs: 60 * 1000 })

  app.use('/admin/activity/*', authRequired)
  app.use('/admin/activity', authRequired)

  // Record an activity log manually (or from admin UI)
  app.post('/admin/activity', rateLimit, async (c) => {
    const input = recordActivityLogSchema.parse(await c.req.json())
    const log = await service.record(c.get('tenant').tenantId, input, c.get('customer')!)
    return c.json({ data: log }, 201)
  })

  // Get audit trail for a specific entity (e.g. /admin/activity/ORDER/:orderId or /admin/activity/PRODUCT/:productId)
  app.get('/admin/activity/:entityType/:entityId', async (c) => {
    const { entityType, entityId } = entityParamsSchema.parse(c.req.param())
    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '50')

    const timeline = await service.getEntityTimeline(
      c.get('tenant').tenantId,
      entityType as ActivityEntityType,
      entityId,
      c.get('customer')!,
      page,
      perPage
    )
    return c.json({ data: timeline })
  })

  // Get activity history performed by a specific actor/staff member
  app.get('/admin/activity/actor/:actorId', async (c) => {
    const { actorId } = actorParamsSchema.parse(c.req.param())
    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '50')

    const history = await service.getActorActivityHistory(
      c.get('tenant').tenantId,
      actorId,
      c.get('customer')!,
      page,
      perPage
    )
    return c.json({ data: history })
  })

  // List activity logs with query filters
  app.get('/admin/activity', async (c) => {
    const entityType = c.req.query('entityType') as ActivityEntityType | undefined
    const entityId = c.req.query('entityId')
    const actorId = c.req.query('actorId')
    const eventType = c.req.query('eventType')
    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '20')

    const logs = await service.listLogs(
      c.get('tenant').tenantId,
      { entityType, entityId, actorId, eventType, page, perPage },
      c.get('customer')!
    )
    return c.json({ data: logs })
  })

  return app
}

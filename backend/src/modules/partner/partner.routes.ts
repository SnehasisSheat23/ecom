import { Hono } from 'hono'

import type { AppBindings } from '../../lib/http.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import type { PartnerService } from './partner.service.js'
import type { PartnerStatus } from './partner.types.js'
import {
  createPartnerSchema,
  partnerIdParamsSchema,
  updatePartnerSchema,
} from './partner.validators.js'

export const createPartnerRoutes = (service: PartnerService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const adminRateLimit = createRateLimitMiddleware({ limit: 30, windowMs: 60 * 1000 })

  const actorFromContext = (c: any) => c.get('customer')

  app.post('/admin/partners', adminRateLimit, async (c) => {
    return c.json(
      {
        data: await service.createPartner(
          c.get('tenant').tenantId,
          createPartnerSchema.parse(await c.req.json()),
          actorFromContext(c)!,
        ),
      },
      201,
    )
  })

  app.get('/admin/partners', async (c) => {
    const status = c.req.query('status') as PartnerStatus | undefined
    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '50')

    return c.json({
      data: await service.listPartners(c.get('tenant').tenantId, actorFromContext(c)!, { status, page, perPage }),
    })
  })

  app.get('/admin/partners/:partnerId', async (c) =>
    c.json({
      data: await service.getPartner(
        c.get('tenant').tenantId,
        partnerIdParamsSchema.parse(c.req.param()).partnerId,
        actorFromContext(c)!,
      ),
    }),
  )

  app.patch('/admin/partners/:partnerId', async (c) =>
    c.json({
      data: await service.updatePartner(
        c.get('tenant').tenantId,
        partnerIdParamsSchema.parse(c.req.param()).partnerId,
        updatePartnerSchema.parse(await c.req.json()),
        actorFromContext(c)!,
      ),
    }),
  )

  app.delete('/admin/partners/:partnerId', async (c) => {
    await service.softDeletePartner(
      c.get('tenant').tenantId,
      partnerIdParamsSchema.parse(c.req.param()).partnerId,
      actorFromContext(c)!,
    )
    return c.json({ data: { ok: true } })
  })

  return app
}

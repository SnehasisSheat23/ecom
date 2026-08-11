import { Hono } from 'hono'
import { z } from 'zod'

import type { AppBindings } from '../../lib/http.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js'
import type { PincodeService } from './pincode.service.js'

const batchLookupSchema = z.object({
  pincodes: z.array(z.string().min(3)),
})

export const createPincodeRoutes = (service: PincodeService) => {
  const app = new Hono<AppBindings>()
  const rateLimit = createRateLimitMiddleware({ limit: 120, windowMs: 60 * 1000 })

  // 1. Search Pincodes / Districts / States (MUST be before :code)
  app.get('/pincode/search', rateLimit, async (c) => {
    const query = c.req.query('q') || c.req.query('query')
    const stateName = c.req.query('state')
    const district = c.req.query('district')
    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '500')

    const result = await service.search({
      query,
      stateName,
      district,
      page,
      perPage,
    })

    return c.json({ data: result })
  })

  // 2. Batch Pincode Lookup (e.g. POST /pincode/batch)
  app.post('/pincode/batch', rateLimit, async (c) => {
    const { pincodes } = batchLookupSchema.parse(await c.req.json())
    const resultMap = await service.lookupBatch(pincodes)
    const items = Array.from(resultMap.values())
    return c.json({ data: items })
  })

  // 3. Single Pincode Lookup (e.g. GET /pincode/110001 or GET /pincode/560037)
  app.get('/pincode/:code', rateLimit, async (c) => {
    const code = c.req.param('code')
    const info = await service.lookup(code)
    if (!info) {
      return c.json({ error: 'Pincode not found', code: 'pincode-not-found' }, 404)
    }
    return c.json({ data: info })
  })

  return app
}

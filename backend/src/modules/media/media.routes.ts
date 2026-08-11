import { Hono } from 'hono'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import type { MediaService, MediaActor } from './media.service.js'
import { listMediaFiltersSchema } from './media.validators.js'

export const createMediaRoutes = (service: MediaService) => {
  const app = new Hono<AppBindings>()

  const requireMediaWriter = (actor?: MediaActor) => {
    if (!actor?.isAdmin && !actor?.isSuperAdmin && !actor?.activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
  }

  const actorFromContext = (c: any): MediaActor | undefined => c.get('customer')

  app.post('/admin/media', async (c) => {
    const actor = actorFromContext(c)
    requireMediaWriter(actor)

    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ error: 'File upload is required', code: 'file-required' }, 400)
    }

    const tenantId = c.get('tenant').tenantId
    const partnerId = actor?.activePartnerId ?? null

    const content = Buffer.from(await file.arrayBuffer())
    const asset = await service.uploadAsset(
      tenantId,
      partnerId,
      file.name,
      file.type || 'application/octet-stream',
      content,
      actor,
    )

    return c.json({ data: asset }, 201)
  })

  app.get('/admin/media', async (c) => {
    const actor = actorFromContext(c)
    requireMediaWriter(actor)

    const query = listMediaFiltersSchema.parse(c.req.query())
    const tenantId = c.get('tenant').tenantId

    const assets = await service.listAssets(
      tenantId,
      {
        page: query.page,
        perPage: query.perPage,
        partnerId: query.partnerId,
      },
      actor,
    )

    return c.json({ data: assets })
  })

  app.delete('/admin/media/:id', async (c) => {
    const actor = actorFromContext(c)
    requireMediaWriter(actor)

    const tenantId = c.get('tenant').tenantId
    const id = c.req.param('id')

    await service.deleteAsset(tenantId, id, actor)
    return c.json({ data: { ok: true } })
  })

  return app
}

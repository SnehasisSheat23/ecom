import { Hono } from 'hono'
import { AppError } from '../../../lib/errors.js'
import type { AppBindings } from '../../../lib/http.js'
import type { CatalogActor } from '../../../layers/authorization/authorization.service.js'
import type { ProductTypeService } from './product-type.service.js'
import {
  createProductTypeSchema,
  listProductTypesQuerySchema,
  updateProductTypeSchema,
} from './product-type.validators.js'

export const createProductTypeRoutes = (service: ProductTypeService) => {
  const routes = new Hono<AppBindings>()

  const tenantFromContext = (c: { get: (key: 'tenant') => { tenantId: string } }): string => {
    const tenant = c.get('tenant')
    if (!tenant || !tenant.tenantId) {
      throw new AppError('Tenant context required', 400, 'tenant-context-required')
    }
    return tenant.tenantId
  }

  const actorFromContext = (c: { get: (key: 'customer') => CatalogActor | undefined }): CatalogActor | undefined =>
    c.get('customer')

  // Public / Storefront routes
  routes.get('/product-types', async (c) => {
    const tenantId = tenantFromContext(c)
    const filters = listProductTypesQuerySchema.parse(c.req.query())
    const result = await service.listProductTypes(tenantId, { ...filters, isActive: true }, actorFromContext(c))
    return c.json({ data: result })
  })

  routes.get('/product-types/:slug', async (c) => {
    const tenantId = tenantFromContext(c)
    const slug = c.req.param('slug')
    const result = await service.getProductTypeBySlug(slug, tenantId)
    return c.json({ data: result })
  })

  // Protected Admin / Vendor routes
  routes.get('/admin/product-types', async (c) => {
    const tenantId = tenantFromContext(c)
    const filters = listProductTypesQuerySchema.parse(c.req.query())
    const result = await service.listProductTypes(tenantId, filters, actorFromContext(c))
    return c.json({ data: result })
  })

  routes.post('/admin/product-types', async (c) => {
    const tenantId = tenantFromContext(c)
    const payload = createProductTypeSchema.parse(await c.req.json())
    const result = await service.createProductType(payload, tenantId, actorFromContext(c))
    return c.json({ data: result }, 201)
  })

  routes.patch('/admin/product-types/:id', async (c) => {
    const tenantId = tenantFromContext(c)
    const id = c.req.param('id')
    const payload = updateProductTypeSchema.parse(await c.req.json())
    const result = await service.updateProductType(id, payload, tenantId, actorFromContext(c))
    return c.json({ data: result })
  })

  routes.delete('/admin/product-types/:id', async (c) => {
    const tenantId = tenantFromContext(c)
    const id = c.req.param('id')
    await service.deleteProductType(id, tenantId, actorFromContext(c))
    return c.json({ success: true })
  })

  return routes
}

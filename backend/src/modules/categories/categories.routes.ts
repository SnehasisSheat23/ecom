import { Hono } from 'hono'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import { CategoriesService } from './categories.service.js'
import {
  categoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from './categories.validators.js'

export const createCategoriesRoutes = (
  service: CategoriesService,
  customersService: CustomersService,
) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)
  const authOptional = createAuthMiddleware(customersService, { optional: true })



  // ─── Public Endpoints ──────────────────────────────────────────

  app.get('/categories', authOptional, async (c) => {
    const tenant = c.get('tenant')
    const query = c.req.query()
    const isTree = query.tree === 'true' || query.tree === '1'
    const includeInactive = query.includeInactive === 'true'

    if (isTree) {
      const tree = await service.getCategoryTree(tenant.tenantId, includeInactive)
      return c.json({ data: tree })
    }

    const filters = categoryQuerySchema.parse(query)
    const list = await service.listCategories(tenant.tenantId, filters)
    return c.json({ data: list })
  })

  app.get('/categories/:slug', authOptional, async (c) => {
    const tenant = c.get('tenant')
    const category = await service.getCategoryBySlug(tenant.tenantId, c.req.param('slug'))
    if (!category) {
      throw new AppError('Category not found', 404, 'category-not-found')
    }
    return c.json({ data: category })
  })

  // ─── Admin Endpoints ──────────────────────────────────────────

  app.post('/admin/categories', async (c) => {
    const actor = c.get('customer')
    const tenant = c.get('tenant')
    const body = await c.req.json()
    const input = createCategorySchema.parse(body)

    const category = await service.createCategory(
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
    return c.json({ data: category }, 201)
  })

  app.patch('/admin/categories/:id', async (c) => {
    const actor = c.get('customer')
    const tenant = c.get('tenant')
    const body = await c.req.json()
    const input = updateCategorySchema.parse(body)

    const category = await service.updateCategory(
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
    return c.json({ data: category })
  })

  app.delete('/admin/categories/:id', async (c) => {
    const actor = c.get('customer')
    const tenant = c.get('tenant')

    await service.deleteCategory(
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

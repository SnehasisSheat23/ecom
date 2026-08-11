import { Hono } from 'hono'
import { BlogsService } from './blogs.service.js'
import {
  createBlogSchema,
  updateBlogSchema,
  rejectBlogSchema,
  toggleVisibilitySchema,
  listBlogsQuerySchema,
  publicListBlogsQuerySchema,
  createBlogCategorySchema,
  updateBlogCategorySchema,
} from './blogs.validators.js'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import type { CustomersService } from '../customers/customers.service.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'

export const createBlogsRoutes = (service: BlogsService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)
  const authOptional = createAuthMiddleware(customersService, { optional: true })

  // Auth middleware for protected routes
  app.use('/vendor/blogs', authRequired)
  app.use('/vendor/blogs/*', authRequired)
  // Admin routes are handled globally in app.ts via app.use('/admin/*', ...)

  // ─── Public Endpoints ──────────────────────────────────────────

  app.get('/blogs', authOptional, async (c) => {
    const tenant = c.get('tenant')
    const { tag, categorySlug, page, perPage } = publicListBlogsQuerySchema.parse(c.req.query())
    return c.json({ data: await service.listPublicBlogs(tenant.tenantId, { tag, categorySlug, page, perPage }) })
  })

  app.get('/blogs/:slug', authOptional, async (c) => {
    const tenant = c.get('tenant')
    return c.json({
      data: await service.getPublicBlogBySlug(tenant.tenantId, c.req.param('slug')),
    })
  })

  app.get('/blog-categories', authOptional, async (c) => {
    const actor = c.get('customer')
    const isAdmin = actor?.isAdmin || actor?.isSuperAdmin
    return c.json({ data: await service.listCategories(actor as any, isAdmin) })
  })

  // ─── Vendor Endpoints ──────────────────────────────────────────

  app.post('/vendor/blogs', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    const tenant = c.get('tenant')
    const body = await c.req.json()
    const input = createBlogSchema.parse(body)

    return c.json({
      data: await service.createBlog(actor, tenant.mode, input),
    })
  })

  app.get('/vendor/blogs', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    const { page, perPage } = listBlogsQuerySchema.parse(c.req.query())
    return c.json({ data: await service.listVendorBlogs(actor, page, perPage) })
  })

  app.get('/vendor/blogs/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    return c.json({ data: await service.getBlog(actor, c.req.param('id')) })
  })

  app.patch('/vendor/blogs/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    const body = await c.req.json()
    const input = updateBlogSchema.parse(body)

    return c.json({ data: await service.updateBlog(actor, c.req.param('id'), input) })
  })

  app.post('/vendor/blogs/:id/resubmit', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    const body = await c.req.json().catch(() => ({}))
    const input = updateBlogSchema.parse(body)

    return c.json({ data: await service.resubmitBlog(actor, c.req.param('id'), input) })
  })

  // Vendor: Upload cover image
  app.post('/vendor/blogs/:id/cover-image', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ error: 'Image file is required', code: 'image-file-required' }, 400)
    }

    const content = Buffer.from(await file.arrayBuffer())
    const updated = await service.uploadCoverImage(actor, c.req.param('id'), {
      filename: file.name,
      contentType: file.type || 'image/webp',
      content,
    })

    return c.json({ data: updated })
  })

  // Vendor: Upload inline image
  app.post('/vendor/blogs/:id/images', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')

    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ error: 'Image file is required', code: 'image-file-required' }, 400)
    }

    const content = Buffer.from(await file.arrayBuffer())
    const image = await service.uploadInlineImage(actor, c.req.param('id'), {
      filename: file.name,
      contentType: file.type || 'image/webp',
      content,
      altText: typeof form.get('altText') === 'string' ? String(form.get('altText')) : null,
      position: typeof form.get('position') === 'string' ? Number(form.get('position')) : undefined,
    })

    return c.json({ data: image }, 201)
  })

  // ─── Admin Endpoints ──────────────────────────────────────────

  app.post('/admin/blog-categories', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const body = await c.req.json()
    const input = createBlogCategorySchema.parse(body)

    return c.json({ data: await service.createCategory(actor, input) })
  })

  app.get('/admin/blog-categories', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    return c.json({ data: await service.listCategories(actor, true) })
  })

  app.patch('/admin/blog-categories/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const body = await c.req.json()
    const input = updateBlogCategorySchema.parse(body)

    return c.json({ data: await service.updateCategory(actor, c.req.param('id'), input) })
  })

  app.delete('/admin/blog-categories/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    await service.deleteCategory(actor, c.req.param('id'))
    return c.json({ data: { deleted: true } })
  })

  app.post('/admin/blogs', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const tenant = c.get('tenant')
    const body = await c.req.json()
    const input = createBlogSchema.parse(body)

    return c.json({ data: await service.createBlog(actor, tenant.mode, input) })
  })

  app.get('/admin/blogs', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const query = listBlogsQuerySchema.parse(c.req.query())
    let partnerId: string | null | undefined = query.partnerId
    if (partnerId === 'null') partnerId = null

    return c.json({
      data: await service.listAdminBlogs(actor, {
        partnerId,
        categoryId: query.categoryId,
        status: query.status,
        page: query.page,
        perPage: query.perPage,
      }),
    })
  })

  app.get('/admin/blogs/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    return c.json({ data: await service.getBlog(actor, c.req.param('id')) })
  })

  app.patch('/admin/blogs/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const body = await c.req.json()
    const input = updateBlogSchema.parse(body)

    return c.json({ data: await service.updateBlog(actor, c.req.param('id'), input) })
  })

  app.post('/admin/blogs/:id/approve', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    return c.json({ data: await service.approveBlog(actor, c.req.param('id')) })
  })

  app.post('/admin/blogs/:id/reject', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const body = await c.req.json()
    const input = rejectBlogSchema.parse(body)

    return c.json({
      data: await service.rejectBlog(actor, c.req.param('id'), input),
    })
  })

  app.patch('/admin/blogs/:id/visibility', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const body = await c.req.json()
    const { isVisible } = toggleVisibilitySchema.parse(body)

    return c.json({
      data: await service.toggleVisibility(actor, c.req.param('id'), isVisible),
    })
  })

  app.delete('/admin/blogs/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    await service.deleteBlog(actor, c.req.param('id'))
    return c.json({ data: { deleted: true } })
  })

  // Admin: Upload cover image
  app.post('/admin/blogs/:id/cover-image', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ error: 'Image file is required', code: 'image-file-required' }, 400)
    }

    const content = Buffer.from(await file.arrayBuffer())
    const updated = await service.uploadCoverImage(actor, c.req.param('id'), {
      filename: file.name,
      contentType: file.type || 'image/webp',
      content,
    })

    return c.json({ data: updated })
  })

  // Admin: Upload inline image
  app.post('/admin/blogs/:id/images', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    const form = await c.req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return c.json({ error: 'Image file is required', code: 'image-file-required' }, 400)
    }

    const content = Buffer.from(await file.arrayBuffer())
    const image = await service.uploadInlineImage(actor, c.req.param('id'), {
      filename: file.name,
      contentType: file.type || 'image/webp',
      content,
      altText: typeof form.get('altText') === 'string' ? String(form.get('altText')) : null,
      position: typeof form.get('position') === 'string' ? Number(form.get('position')) : undefined,
    })

    return c.json({ data: image }, 201)
  })

  // Admin: Delete inline image
  app.delete('/admin/blogs/images/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }

    await service.deleteInlineImage(actor, c.req.param('id'))
    return c.json({ data: { deleted: true } })
  })

  return app
}

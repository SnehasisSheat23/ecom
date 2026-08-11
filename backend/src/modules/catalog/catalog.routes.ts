import { Hono } from 'hono'
import { z } from 'zod'

import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js'
import type { CatalogService } from './catalog.service.js'
import {
  bulkDeleteProductsSchema,
  createCategorySchema,
  createCollectionSchema,
  createProductSchema,
  listCollectionsQuerySchema,
  listProductsQuerySchema,
  updateCategorySchema,
  updateCollectionSchema,
  updateProductSchema,
  updateVariantSchema,
} from './catalog.validators.js'
import type { CatalogActor } from './catalog.types.js'

export const createCatalogRoutes = (service: CatalogService) => {
  const app = new Hono<AppBindings>()
  const publicReadRateLimit = createRateLimitMiddleware({ limit: 120, windowMs: 60 * 1000 })

  const requireCatalogAdmin = (isAdmin?: boolean, isSuperAdmin?: boolean) => {
    if (!isAdmin && !isSuperAdmin) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
  }

  const requireCatalogWriter = (actor?: CatalogActor) => {
    if (!actor?.isAdmin && !actor?.isSuperAdmin && !actor?.activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
  }

  const actorFromContext = (c: { get: (key: 'customer') => CatalogActor | undefined }): CatalogActor | undefined =>
    c.get('customer')

  const enrichProductWithCurrency = <T extends { variants?: unknown[] } | null>(
    product: T,
    currency: string,
  ) => {
    if (!product) return product
    return {
      ...product,
      currency,
      variants: (product.variants as Array<Record<string, unknown>> | undefined)?.map((v) => ({
        ...v,
        currency,
      })) || [],
    }
  }

  const enrichProductListWithCurrency = <T extends { items?: Array<{ variants?: unknown[] }> } | null>(
    result: T,
    currency: string,
  ) => {
    if (!result || !result.items) return result
    return {
      ...result,
      items: result.items.map((p) => enrichProductWithCurrency(p, currency)),
    }
  }

  app.post('/admin/products', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = createProductSchema.parse(await c.req.json())
    return c.json(
      { data: await service.createProduct(payload, c.get('tenant').tenantId, actorFromContext(c)) },
      201,
    )
  })

  app.get('/admin/products', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const query = listProductsQuerySchema.parse(c.req.query())
    const result = await service.listProducts(c.get('tenant').tenantId, {
      page: query.page,
      perPage: query.perPage,
      status: query.status,
      categorySlug: query.categorySlug,
      productTypeId: query.productTypeId,
      search: query.search,
      includeDeleted: query.includeDeleted ?? false,
      approvalStatus: query.approvalStatus,
      hasVendor: query.hasVendor,
      summary: query.summary,
      partnerId: query.isOwner 
        ? null 
        : (query.partnerId ?? (!c.get('isAdmin') && !c.get('isSuperAdmin') ? c.get('customer')?.activePartnerId ?? null : undefined)),
    }, actorFromContext(c))
    return c.json({
      data: enrichProductListWithCurrency(result, c.get('tenant').config.currency),
    })
  })

  app.get('/admin/products/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const product = await service.getProduct(
      c.req.param('id'),
      c.get('tenant').tenantId,
      true,
      actorFromContext(c),
    )
    return c.json({
      data: enrichProductWithCurrency(product, c.get('tenant').config.currency),
    })
  })

  app.patch('/admin/products/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = updateProductSchema.parse(await c.req.json())
    const product = await service.updateProduct(
      c.req.param('id'),
      payload,
      c.get('tenant').tenantId,
      actorFromContext(c),
    )
    return c.json({
      data: enrichProductWithCurrency(product, c.get('tenant').config.currency),
    })
  })

  app.delete('/admin/products/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    await service.softDeleteProduct(c.req.param('id'), c.get('tenant').tenantId, actorFromContext(c))
    return c.json({ data: { ok: true } })
  })

  app.post('/admin/products/bulk-delete', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = bulkDeleteProductsSchema.parse(await c.req.json())
    await service.softDeleteProducts(payload.ids, c.get('tenant').tenantId, actorFromContext(c))
    return c.json({ data: { ok: true } })
  })

  app.patch('/admin/products/:id/approval', async (c) => {
    requireCatalogAdmin(c.get('isAdmin'), c.get('isSuperAdmin'))
    const body = (await c.req.json()) as { approvalStatus: 'APPROVED' | 'REJECTED'; rejectionReason?: string }
    const { approvalStatus, rejectionReason } = body
    if (!approvalStatus || !['APPROVED', 'REJECTED'].includes(approvalStatus)) {
      throw new AppError('approvalStatus must be APPROVED or REJECTED', 400, 'invalid-approval-status')
    }
    const product = await service.updateProduct(
      c.req.param('id'),
      {
        approvalStatus,
        rejectionReason: approvalStatus === 'APPROVED' ? null : (rejectionReason ?? null),
      },
      c.get('tenant').tenantId,
      actorFromContext(c),
    )
    return c.json({
      data: enrichProductWithCurrency(product, c.get('tenant').config.currency),
    })
  })

  app.post('/admin/products/:id/variants', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = createProductSchema.shape.variants.element.parse(await c.req.json())
    const variant = await service.addVariant(
      c.req.param('id'),
      payload,
      c.get('tenant').tenantId,
      actorFromContext(c),
    )
    return c.json(
      {
        data: {
          ...variant,
          currency: c.get('tenant').config.currency,
        },
      },
      201,
    )
  })

  app.patch('/admin/variants/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = updateVariantSchema.parse(await c.req.json())
    const variant = await service.updateVariant(
      c.req.param('id'),
      payload,
      c.get('tenant').tenantId,
      c.get('customer')?.customerId,
      actorFromContext(c),
    )
    return c.json({
      data: {
        ...variant,
        currency: c.get('tenant').config.currency,
      },
    })
  })

  app.delete('/admin/variants/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    await service.deleteVariant(c.req.param('id'), c.get('tenant').tenantId, actorFromContext(c))
    return c.json({ data: { ok: true } })
  })

  app.post('/admin/products/:id/images', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = z
      .object({
        mediaId: z.string().uuid(),
        variantId: z.string().uuid().nullable().optional(),
        altText: z.string().nullable().optional(),
        position: z.number().int().min(0).optional(),
      })
      .parse(await c.req.json())

    const image = await service.associateImage(
      c.get('tenant').tenantId,
      c.req.param('id'),
      payload,
      actorFromContext(c),
    )

    return c.json({ data: image }, 201)
  })

  app.delete('/admin/images/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    await service.deleteImage(c.req.param('id'), c.get('tenant').tenantId, actorFromContext(c))
    return c.json({ data: { ok: true } })
  })

  app.patch('/admin/images/:id', async (c) => {
    requireCatalogWriter(actorFromContext(c))
    const payload = z
      .object({
        variantId: z.string().uuid().nullable().optional(),
        position: z.number().int().min(0).optional(),
        altText: z.string().nullable().optional(),
      })
      .parse(await c.req.json())

    const image = await service.updateImage(
      c.req.param('id'),
      payload,
      c.get('tenant').tenantId,
      actorFromContext(c),
    )
    return c.json({ data: image })
  })

  app.get('/public/search', publicReadRateLimit, async (c) => {
    const query = c.req.query('q')?.toLowerCase() || ''
    const tenantId = c.get('tenant').tenantId
    
    // 1. Try to fetch from KV Index
    const index = await c.env.SEARCH_KV.get(`search:${tenantId}:index`, 'json')
    if (!index) {
      return c.json({ data: [] })
    }

    // 2. Simple in-memory search
    const results = (index as any[])
      .filter((p) => 
        p.t.toLowerCase().includes(query) || 
        p.sk.toLowerCase().includes(query)
      )
      .slice(0, 24)

    const response = c.json({ data: results })
    
    // 3. Set Cache-Control for CDN caching (reduces KV reads further)
    response.headers.set('Cache-Control', 'public, max-age=300') 
    
    return response
  })

  app.get('/products', publicReadRateLimit, async (c) => {
    const query = listProductsQuerySchema.parse(c.req.query())
    const result = await service.listPublicProducts(c.get('tenant').tenantId, query)
    return c.json({
      data: enrichProductListWithCurrency(result, c.get('tenant').config.currency),
    })
  })

  app.get('/products/:slug', publicReadRateLimit, async (c) => {
    const product = await service.getProductBySlug(c.get('tenant').tenantId, c.req.param('slug'))
    return c.json({
      data: enrichProductWithCurrency(product, c.get('tenant').config.currency),
    })
  })

  return app
}

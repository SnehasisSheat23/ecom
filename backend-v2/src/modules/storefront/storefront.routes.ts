import { Hono } from 'hono'
import { StorefrontService } from './storefront.service.js'

const storefrontService = new StorefrontService()
export const storefrontRoutes = new Hono()

// GET /api/v1/storefront/snapshot - Combined catalog snapshot (categories + featured products) for fast caching
storefrontRoutes.get('/snapshot', async (c) => {
  try {
    const lang = (c.req.query('lang') || 'en') as 'en' | 'ar'
    const currency = c.req.query('currency') || 'AED'
    const snapshot = await storefrontService.getCatalogSnapshot(lang, currency)
    return c.json({ success: true, data: snapshot })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch catalog snapshot' }, 500)
  }
})

// GET /api/v1/storefront/categories - Get active storefront categories
storefrontRoutes.get('/categories', async (c) => {
  try {
    const lang = (c.req.query('lang') || 'en') as 'en' | 'ar'
    const tree = c.req.query('tree') !== 'false'
    const data = await storefrontService.getCategories({ lang, tree })
    return c.json({ success: true, data })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch categories' }, 500)
  }
})

// GET /api/v1/storefront/categories/:idOrSlug - Get active category detail by ID or Slug
storefrontRoutes.get('/categories/:idOrSlug', async (c) => {
  try {
    const idOrSlug = c.req.param('idOrSlug')
    const lang = (c.req.query('lang') || 'en') as 'en' | 'ar'
    const category = await storefrontService.getCategoryBySlugOrId(idOrSlug, lang)

    if (!category) {
      return c.json({ success: false, error: 'Category not found or inactive' }, 404)
    }

    return c.json({ success: true, data: category })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch category details' }, 500)
  }
})

// GET /api/v1/storefront/products - Get active products with filters, sorting, and pagination
storefrontRoutes.get('/products', async (c) => {
  try {
    const lang = (c.req.query('lang') || 'en') as 'en' | 'ar'
    const currency = c.req.query('currency') || 'AED'
    const q = c.req.query('q')
    const categoryId = c.req.query('categoryId')
    const categorySlug = c.req.query('categorySlug')
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 20
    const page = c.req.query('page') ? parseInt(c.req.query('page')!, 10) : 1
    const sort = c.req.query('sort') as 'newest' | 'price_asc' | 'price_desc' | undefined

    const result = await storefrontService.getProducts({
      lang,
      currency,
      q,
      categoryId,
      categorySlug,
      limit,
      page,
      sort,
    })

    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch products' }, 500)
  }
})

// GET /api/v1/storefront/products/:idOrSlug - Get single active product detail by ID or Slug
storefrontRoutes.get('/products/:idOrSlug', async (c) => {
  try {
    const idOrSlug = c.req.param('idOrSlug')
    const lang = (c.req.query('lang') || 'en') as 'en' | 'ar'
    const currency = c.req.query('currency') || 'AED'

    const product = await storefrontService.getProductBySlugOrId(idOrSlug, lang, currency)

    if (!product) {
      return c.json({ success: false, error: 'Product not found or inactive' }, 404)
    }

    return c.json({ success: true, data: product })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch product details' }, 500)
  }
})

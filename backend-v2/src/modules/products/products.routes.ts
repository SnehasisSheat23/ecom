import { Hono } from 'hono'
import { ProductsService } from './products.service.js'

const productsService = new ProductsService()

export const productsRoutes = new Hono()

// GET /api/v1/products - List products
productsRoutes.get('/', async (c) => {
  const lang = (c.req.query('lang') as 'en' | 'ar') || 'en'
  const currency = c.req.query('currency') || 'AED'
  const q = c.req.query('q') || c.req.query('search')
  const status = c.req.query('status')
  const limit = c.req.query('perPage') ? parseInt(c.req.query('perPage')!) : (c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50)
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1

  const result = await productsService.getProducts({ lang, currency, q, status, limit, page })
  return c.json({ success: true, data: result })
})

// GET /api/v1/products/:idOrSlug - Single product detail
productsRoutes.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug')
  const lang = (c.req.query('lang') as 'en' | 'ar') || 'en'
  const currency = c.req.query('currency') || 'AED'

  const product = await productsService.getProductByIdOrSlug(idOrSlug, lang, currency)
  if (!product) {
    return c.json({ success: false, error: 'Product not found' }, 404)
  }
  return c.json({ success: true, data: product })
})

// POST /api/v1/products - Create product
productsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const product = await productsService.createProduct(body)
    return c.json({ success: true, data: product }, 201)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to create product' }, 400)
  }
})

// Update product handler (supports PUT & PATCH /:id)
const handleUpdateProduct = async (c: any) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const updated = await productsService.updateProduct(id, body)
    if (!updated) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    return c.json({ success: true, data: updated })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update product' }, 400)
  }
}

productsRoutes.put('/:id', handleUpdateProduct)
productsRoutes.patch('/:id', handleUpdateProduct)

// POST /api/v1/products/:id/images - Add image to product
productsRoutes.post('/:id/images', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const imageUrl = body.url || body.mediaUrl || 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/default.jpg'
    
    const existing = await productsService.getProductByIdOrSlug(id)
    if (!existing) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }

    const currentImages = existing.images || []
    const updatedImages = [...currentImages, imageUrl]

    const updated = await productsService.updateProduct(id, { images: updatedImages })
    return c.json({
      success: true,
      data: {
        id: `img-${Date.now()}`,
        url: imageUrl,
        position: currentImages.length,
        product: updated,
      },
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to add product image' }, 400)
  }
})

// DELETE /api/v1/products/:id - Delete product
productsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const deleted = await productsService.deleteProduct(id)
  if (!deleted) {
    return c.json({ success: false, error: 'Product not found' }, 404)
  }
  return c.json({ success: true, message: 'Product deleted successfully', data: deleted })
})

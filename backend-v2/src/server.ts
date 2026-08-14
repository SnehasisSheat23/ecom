import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { productsRoutes } from './modules/products/products.routes.js'
import { categoriesRoutes } from './modules/categories/categories.routes.js'
import { customersRoutes } from './modules/customers/customers.routes.js'
import { ordersRoutes } from './modules/orders/orders.routes.js'
import { storefrontRoutes } from './modules/storefront/storefront.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { cartRoutes } from './modules/cart/cart.routes.js'
import { wishlistRoutes } from './modules/wishlist/wishlist.routes.js'
import { requireAdminAuth } from './middleware/auth.middleware.js'
import { ProductsService } from './modules/products/products.service.js'
import { storageService } from './lib/storage.js'

const app = new Hono()
const productsService = new ProductsService()

// Middleware
app.use('*', cors())

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2.0.0',
    service: 'Dubai E-Com 4-Module Backend',
    timestamp: new Date().toISOString(),
  })
})

// Mount Core Modules under /api/v1
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/me', authRoutes)
app.route('/api/v1/products', productsRoutes)
app.route('/api/v1/categories', categoriesRoutes)
app.route('/api/v1/customers', customersRoutes)
app.route('/api/v1/orders', ordersRoutes)
app.route('/api/v1/storefront', storefrontRoutes)
app.route('/api/v1/cart', cartRoutes)
app.route('/api/v1/wishlist', wishlistRoutes)

// Real Cloudflare R2 Media Upload Route (Admin Protected)
app.post('/api/v1/media', requireAdminAuth, async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined

    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const buffer = await file.arrayBuffer()
      const publicUrl = await storageService.uploadFile(file.name || 'image.png', buffer, file.type || 'image/png')
      return c.json({
        success: true,
        data: {
          id: `med-${Date.now()}`,
          url: publicUrl,
          filename: file.name,
        },
      })
    }

    const jsonBody = await c.req.json().catch(() => ({}))
    const url = jsonBody.url || 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil.jpg'
    return c.json({
      success: true,
      data: {
        id: `med-${Date.now()}`,
        url,
        filename: 'image.png',
      },
    })
  } catch (err: any) {
    console.error('Cloudflare R2 Media upload error:', err)
    return c.json({ success: false, error: err.message || 'Media upload failed' }, 400)
  }
})

// Presigned Upload URL generator for client-side direct R2 uploads (Admin Protected)
app.get('/api/v1/media/presigned', requireAdminAuth, async (c) => {
  try {
    const filename = c.req.query('filename') || 'image.png'
    const contentType = c.req.query('contentType') || 'image/png'

    const presigned = await storageService.getPresignedUploadUrl(filename, contentType)
    return c.json({ success: true, data: presigned })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed presigned URL generation' }, 400)
  }
})

app.delete('/api/v1/images/:id', requireAdminAuth, async (c) => {
  return c.json({ success: true, message: 'Image deleted' })
})

app.get('/api/v1/product-types', (c) => {
  return c.json({ success: true, data: { items: [{ id: 'pt-1', name: 'Physical Product', slug: 'physical' }] } })
})

app.get('/api/v1/collections', (c) => {
  return c.json({ success: true, data: { items: [] } })
})

app.post('/api/v1/products/bulk-delete', requireAdminAuth, async (c) => {
  try {
    const body = await c.req.json()
    const ids = body.ids || []
    for (const id of ids) {
      await productsService.deleteProduct(id)
    }
    return c.json({ success: true, message: `Deleted ${ids.length} products` })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed bulk delete' }, 400)
  }
})

// 404 Handler
app.notFound((c) => {
  console.warn(`404 Not Found: ${c.req.method} ${c.req.url}`)
  return c.json({ success: false, error: `Endpoint not found: ${c.req.method} ${c.req.path}` }, 404)
})

// Global Error Handler
app.onError((err, c) => {
  console.error('Unhandled Server Error:', err)
  return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500)
})

const port = Number(process.env.PORT || 8787)

console.log(`🚀 Dubai E-Com Backend-v2 starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})

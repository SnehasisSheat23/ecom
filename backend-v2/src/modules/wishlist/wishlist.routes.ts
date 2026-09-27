import { Hono } from 'hono'
import { WishlistService } from './wishlist.service.js'
import { requireCustomerAuth } from '../../middleware/auth.middleware.js'

type Env = {
  Variables: {
    customer: any
    customerId: string
  }
}

const wishlistService = new WishlistService()
export const wishlistRoutes = new Hono<Env>()

// All wishlist endpoints require customer authentication
wishlistRoutes.use('*', requireCustomerAuth)

// GET /api/v1/wishlist - Get customer wishlist
wishlistRoutes.get('/', async (c) => {
  try {
    const customerId = c.get('customerId')
    const result = await wishlistService.getWishlist(customerId)
    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch wishlist' }, 500)
  }
})

// POST /api/v1/wishlist/toggle - Toggle wishlist item
wishlistRoutes.post('/toggle', async (c) => {
  try {
    const customerId = c.get('customerId')
    const body = await c.req.json()
    const productId = body?.productId || body?.id
    if (!productId) {
      return c.json({ success: false, error: 'productId is required' }, 400)
    }
    const result = await wishlistService.toggleWishlist(customerId, productId)
    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to toggle wishlist' }, 400)
  }
})

// POST /api/v1/wishlist/merge - Merge local storage guest wishlist into customer wishlist
wishlistRoutes.post('/merge', async (c) => {
  try {
    const customerId = c.get('customerId')
    const body = await c.req.json()
    const productIds = Array.isArray(body?.productIds) ? body.productIds : (Array.isArray(body) ? body : [])
    const result = await wishlistService.mergeWishlist(customerId, productIds)
    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to merge wishlist' }, 400)
  }
})

// DELETE /api/v1/wishlist/:productId - Remove specific product from wishlist
wishlistRoutes.delete('/:productId', async (c) => {
  try {
    const customerId = c.get('customerId')
    const productId = c.req.param('productId')
    const result = await wishlistService.removeFromWishlist(customerId, productId)
    return c.json({ success: true, data: result })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to remove from wishlist' }, 400)
  }
})

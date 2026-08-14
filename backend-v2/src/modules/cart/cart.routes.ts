import { Hono } from 'hono'
import { CartService } from './cart.service.js'
import { requireCustomerAuth } from '../../middleware/auth.middleware.js'
import type { JwtPayload } from '../../lib/auth-crypto.js'

type Env = {
  Variables: {
    customer: JwtPayload
    customerId: string
  }
}

const cartService = new CartService()
export const cartRoutes = new Hono<Env>()

// All cart endpoints require customer authentication
cartRoutes.use('*', requireCustomerAuth)

// GET /api/v1/cart - Get current customer's cart
cartRoutes.get('/', async (c) => {
  try {
    const customer = c.get('customer')
    const cart = await cartService.getCart(customer.sub)
    return c.json({ success: true, data: cart })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to fetch cart' }, 500)
  }
})

// POST /api/v1/cart/merge - Merge local storage guest cart into customer cart
cartRoutes.post('/merge', async (c) => {
  try {
    const customer = c.get('customer')
    const body = await c.req.json()
    const items = Array.isArray(body?.items) ? body.items : (Array.isArray(body) ? body : [])
    const cart = await cartService.mergeCart(customer.sub, items)
    return c.json({ success: true, data: cart })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to merge cart' }, 400)
  }
})

// POST /api/v1/cart/items - Add an item to customer cart
cartRoutes.post('/items', async (c) => {
  try {
    const customer = c.get('customer')
    const body = await c.req.json()
    const cart = await cartService.addItem(customer.sub, body)
    return c.json({ success: true, data: cart })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to add item to cart' }, 400)
  }
})

// PUT /api/v1/cart/items/:id - Update item quantity
cartRoutes.put('/items/:id', async (c) => {
  try {
    const customer = c.get('customer')
    const itemId = c.req.param('id')
    const body = await c.req.json()
    const quantity = typeof body.quantity === 'number' ? body.quantity : parseInt(body.quantity || '1', 10)
    const cart = await cartService.updateQuantity(customer.sub, itemId, quantity)
    return c.json({ success: true, data: cart })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update item quantity' }, 400)
  }
})

// DELETE /api/v1/cart/items/:id - Remove item from cart
cartRoutes.delete('/items/:id', async (c) => {
  try {
    const customer = c.get('customer')
    const itemId = c.req.param('id')
    const cart = await cartService.removeItem(customer.sub, itemId)
    return c.json({ success: true, data: cart })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to remove item' }, 400)
  }
})

// DELETE /api/v1/cart - Clear all cart items
cartRoutes.delete('/', async (c) => {
  try {
    const customer = c.get('customer')
    const cart = await cartService.clearCart(customer.sub)
    return c.json({ success: true, data: cart })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to clear cart' }, 500)
  }
})

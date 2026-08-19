import { Hono } from 'hono'
import { OrdersService } from './orders.service.js'

const ordersService = new OrdersService()

export const ordersRoutes = new Hono()

// GET /api/v1/orders or /api/v1/orders/list-summary - List orders
const handleGetOrders = async (c: any) => {
  const status = c.req.query('status')
  let customerId = c.req.query('customerId')
  const email = c.req.query('email')
  const limit = c.req.query('perPage') ? parseInt(c.req.query('perPage')!) : (c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20)
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1
  const sortBy = c.req.query('sortBy')
  const sortOrder = c.req.query('sortOrder')
  const search = c.req.query('search') || c.req.query('q')

  // Check Bearer token auth if customerId not explicitly provided in query
  if (!customerId) {
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim()
      try {
        const { verifyJwt } = await import('../../lib/auth-crypto.js')
        const JWT_SECRET = process.env.APP_SECRET || process.env.JWT_SECRET || 'dubai-ecom-secure-jwt-secret-key-2026'
        const payload = verifyJwt<any>(token, JWT_SECRET)
        if (payload && payload.type === 'customer' && payload.sub) {
          customerId = payload.sub
        }
      } catch (e) {
        // invalid token
      }
    }
  }

  const result = await ordersService.getOrders({ status, customerId, email, limit, page, sortBy, sortOrder, search })
  return c.json({ success: true, data: result })
}

ordersRoutes.get('/', handleGetOrders)
ordersRoutes.get('/list-summary', handleGetOrders)
ordersRoutes.get('/summary', handleGetOrders)

// POST /api/v1/orders - Create order
ordersRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()

    // 1. Check if customer is authenticated via Bearer token
    let customerId = body.customerId
    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim()
      const { verifyJwt } = await import('../../lib/auth-crypto.js')
      const JWT_SECRET = process.env.APP_SECRET || process.env.JWT_SECRET || 'dubai-ecom-secure-jwt-secret-key-2026'
      const payload = verifyJwt<any>(token, JWT_SECRET)
      if (payload && payload.type === 'customer' && payload.sub) {
        customerId = payload.sub
      }
    }

    // 2. If not in token, look up customer by email in database
    if (!customerId && (body.guestEmail || body.shippingAddressSnapshot?.email || body.email)) {
      const email = (body.guestEmail || body.shippingAddressSnapshot?.email || body.email).trim().toLowerCase()
      const db = (await import('../../lib/db.js')).getDatabase()
      const { customers } = await import('../../database/schema.js')
      const { eq } = await import('drizzle-orm')
      const [matchedCustomer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1)
      if (matchedCustomer) {
        customerId = matchedCustomer.id
      }
    }

    const order = await ordersService.createOrder({
      ...body,
      customerId,
    })
    return c.json({ success: true, data: order }, 201)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to place order' }, 400)
  }
})

// GET /api/v1/orders/:id - Get single order details
ordersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const order = await ordersService.getOrderById(id)
  if (!order) {
    return c.json({ success: false, error: 'Order not found' }, 404)
  }
  return c.json({ success: true, data: order })
})

// PATCH /api/v1/orders/:id/status - Update order status
ordersRoutes.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    if (!body.status) {
      return c.json({ success: false, error: 'Status field is required' }, 400)
    }

    const updated = await ordersService.updateOrderStatus(id, body.status)
    if (!updated) {
      return c.json({ success: false, error: 'Order not found' }, 404)
    }
    return c.json({ success: true, data: updated })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update order status' }, 400)
  }
})

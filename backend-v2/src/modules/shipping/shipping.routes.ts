import { Hono } from 'hono'
import { shippingService } from './shipping.service.js'

export const shippingRoutes = new Hono()

// GET /api/v1/shipping/methods - List shipping methods
shippingRoutes.get('/methods', async (c) => {
  const currency = c.req.query('currency')
  const methods = await shippingService.getMethods(currency)
  return c.json({
    success: true,
    data: {
      items: methods,
      total: methods.length,
    },
  })
})

// GET /api/v1/shipping/calculate - Calculate shipping cost
shippingRoutes.get('/calculate', async (c) => {
  const methodId = c.req.query('methodId') || c.req.query('method')
  const currency = c.req.query('currency')
  const subtotal = c.req.query('subtotal') ? parseFloat(c.req.query('subtotal')!) : undefined

  const calculation = await shippingService.calculateShippingCost({
    methodId,
    currency,
    subtotal,
  })

  return c.json({
    success: true,
    data: calculation,
  })
})

// GET /api/v1/shipping/methods/:id - Get single method
shippingRoutes.get('/methods/:id', async (c) => {
  const id = c.req.param('id')
  const method = await shippingService.getMethodById(id)
  if (!method) {
    return c.json({ success: false, error: 'Shipping method not found' }, 404)
  }
  return c.json({ success: true, data: method })
})

// POST /api/v1/shipping/methods - Create new method (Admin)
shippingRoutes.post('/methods', async (c) => {
  try {
    const body = await c.req.json()
    if (!body.name) {
      return c.json({ success: false, error: 'Name is required' }, 400)
    }
    const created = await shippingService.createMethod(body)
    return c.json({ success: true, data: created }, 201)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to create shipping method' }, 400)
  }
})

// PATCH /api/v1/shipping/methods/:id - Update method (Admin)
shippingRoutes.patch('/methods/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const updated = await shippingService.updateMethod(id, body)
    if (!updated) {
      return c.json({ success: false, error: 'Shipping method not found' }, 404)
    }
    return c.json({ success: true, data: updated })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update shipping method' }, 400)
  }
})

// DELETE /api/v1/shipping/methods/:id - Delete method (Admin)
shippingRoutes.delete('/methods/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await shippingService.deleteMethod(id)
  if (!ok) {
    return c.json({ success: false, error: 'Shipping method not found or could not be deleted' }, 404)
  }
  return c.json({ success: true, message: 'Shipping method deleted' })
})

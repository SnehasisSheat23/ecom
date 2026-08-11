import { Hono } from 'hono'

import type { AppBindings } from '../../lib/http.js'
import type { CustomersService } from '../customers/customers.service.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CartService } from './cart.service.js'
import {
  addCartItemSchema,
  cartExpiryJobPayloadSchema,
  cartItemParamsSchema,
  checkoutSchema,
  couponSchema,
  guestCartHeaderSchema,
  loyaltySchema,
  syncCartSchema,
  updateCartItemSchema,
} from './cart.validators.js'
import { AppError } from '../../lib/errors.js'

export const createCartRoutes = (service: CartService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const optionalAuth = createAuthMiddleware(customersService, { optional: true })

  const ownerFromContext = (c: { get: AppBindings['Variables'] extends infer V ? (key: keyof V & string) => any : never; req: { header: (name: string) => string | undefined } }) => {
    const customer = c.get('customer')
    if (customer) {
      return { customerId: customer.customerId }
    }

    const headers = guestCartHeaderSchema.parse({ 'x-guest-session-id': c.req.header('x-guest-session-id') })
    if (!headers['x-guest-session-id']) {
      throw new AppError('Guest session required', 401, 'guest-session-required')
    }

    return { guestSessionId: headers['x-guest-session-id'] }
  }

  app.use('/cart', optionalAuth)
  app.use('/cart/*', optionalAuth)

  app.get('/cart', async (c) => c.json({ data: await service.getCurrentCart(c.get('tenant'), ownerFromContext(c)) }))

  app.post('/cart/sync', async (c) => {
    const { items } = syncCartSchema.parse(await c.req.json())
    const tenant = c.get('tenant')
    await service.syncItems(tenant.tenantId, ownerFromContext(c), items)
    return c.json({ data: { success: true } })
  })

  app.post('/cart/items', async (c) =>
    c.json(
      { data: await service.addItem(c.get('tenant'), ownerFromContext(c), addCartItemSchema.parse(await c.req.json())) },
      201,
    ),
  )

  app.patch('/cart/items/:itemId', async (c) => {
    const params = cartItemParamsSchema.parse(c.req.param())
    const payload = updateCartItemSchema.parse(await c.req.json())
    return c.json({
      data: await service.updateItem(c.get('tenant'), ownerFromContext(c), params.itemId, payload.quantity),
    })
  })

  app.delete('/cart/items/:itemId', async (c) => {
    const params = cartItemParamsSchema.parse(c.req.param())
    return c.json({ data: await service.removeItem(c.get('tenant'), ownerFromContext(c), params.itemId) })
  })

  app.post('/cart/coupon', async (c) =>
    c.json({
      data: await service.applyCoupon(
        c.get('tenant'),
        ownerFromContext(c),
        couponSchema.parse(await c.req.json()).code,
      ),
    }),
  )

  app.delete('/cart/coupon', async (c) =>
    c.json({ data: await service.removeCoupon(c.get('tenant'), ownerFromContext(c)) }),
  )

  app.post('/cart/loyalty', async (c) =>
    c.json({
      data: await service.applyLoyalty(
        c.get('tenant'),
        ownerFromContext(c),
        loyaltySchema.parse(await c.req.json()).points,
      ),
    }),
  )

  app.delete('/cart/loyalty', async (c) =>
    c.json({ data: await service.removeLoyalty(c.get('tenant'), ownerFromContext(c)) }),
  )

  app.post('/cart/checkout', async (c) =>
    c.json({
      data: await service.checkout(c.get('tenant'), ownerFromContext(c), checkoutSchema.parse(await c.req.json().catch(() => ({})))),
    }),
  )

  app.post('/internal/jobs/cart/expiry', async (c) => {
    await service.expireCart(cartExpiryJobPayloadSchema.parse(await c.req.json()))
    return c.json({ ok: true })
  })

  app.post('/internal/jobs/cart/cleanup', async (c) => {
    const result = await service.cleanupExpiredCarts()
    return c.json({ ok: true, data: result })
  })

  return app
}


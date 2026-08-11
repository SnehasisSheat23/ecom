import { Hono } from 'hono'

import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import {
  completeCheckoutSchema,
  initiateCheckoutSchema,
  selectShippingSchema,
} from './checkout.validators.js'
import type { CheckoutService } from './checkout.service.js'

export const createCheckoutRoutes = (
  service: CheckoutService,
  customersService: CustomersService,
) => {
  const app = new Hono<AppBindings>()
  const optionalAuth = createAuthMiddleware(customersService, { optional: true })

  app.use('/checkout/*', optionalAuth)

  // POST /checkout/initiate
  app.post('/checkout/initiate', async (c) => {
    const tenant = c.get('tenant')
    const customer = c.get('customer')
    const body = await c.req.json()
    const input = initiateCheckoutSchema.parse(body)

    const checkout = await service.initiateCheckout(tenant, input, customer)
    return c.json({ success: true, checkout }, 201)
  })

  // GET /checkout/group/:groupId
  app.get('/checkout/group/:groupId', async (c) => {
    const tenant = c.get('tenant')
    const groupId = c.req.param('groupId')

    const checkoutGroup = await service.getCheckoutGroup(tenant.tenantId, groupId)
    return c.json({ success: true, checkoutGroup })
  })

  // GET /checkout/:checkoutId
  app.get('/checkout/:checkoutId', async (c) => {
    const tenant = c.get('tenant')
    const checkoutId = c.req.param('checkoutId')

    const checkout = await service.getCheckout(tenant.tenantId, checkoutId)
    return c.json({ success: true, checkout })
  })

  // POST /checkout/:checkoutId/shipping
  app.post('/checkout/:checkoutId/shipping', async (c) => {
    const tenant = c.get('tenant')
    const checkoutId = c.req.param('checkoutId')
    const body = await c.req.json()
    const input = selectShippingSchema.parse(body)

    const checkout = await service.selectShipping(tenant.tenantId, checkoutId, input)
    return c.json({ success: true, checkout })
  })

  // POST /checkout/:checkoutId/complete
  app.post('/checkout/:checkoutId/complete', async (c) => {
    const tenant = c.get('tenant')
    const customer = c.get('customer')
    const checkoutId = c.req.param('checkoutId')
    const body = await c.req.json()
    const input = completeCheckoutSchema.parse(body)

    const res = await service.completeCheckout(tenant, checkoutId, input, customer)
    return c.json({
      success: true,
      checkout: res.checkout,
      checkoutGroup: res.checkoutGroup,
      order: res.result.order,
      orders: res.result.orders ?? [res.result.order],
      paymentIntent: res.result.paymentIntent,
    })
  })

  return app
}

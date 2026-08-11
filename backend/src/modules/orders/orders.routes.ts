import { Hono } from 'hono'

import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import type { OrdersService } from './orders.service.js'
import {
  listOrdersQuerySchema,
  listAdminOrdersQuerySchema,
  orderParamsSchema,
  orderTrackQuerySchema,
  placeOrderSchema,
  updateOrderStatusSchema,
} from './orders.validators.js'

export const createOrdersRoutes = (service: OrdersService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const optionalAuth = createAuthMiddleware(customersService, { optional: true })
  const authRequired = createAuthMiddleware(customersService)
  const normalizeAddress = (address: {
    fullName?: string | null
    label?: string | null
    line1: string
    line2?: string | null
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string | null
  }) => ({
    ...address,
    line2: address.line2 ?? null,
    phone: address.phone ?? null,
  })

  const enrichOrderWithCurrency = (order: any, tenantCurrency: string) => {
    if (!order) return order
    return {
      ...order,
      currency: (order.metadata?.currency as string) || order.paymentIntent?.currency || tenantCurrency,
    }
  }

  const enrichOrderListWithCurrency = (result: any, tenantCurrency: string) => {
    if (!result) return result
    if (Array.isArray(result)) {
      return result.map((item) => enrichOrderWithCurrency(item, tenantCurrency))
    }
    if (result.items) {
      return {
        ...result,
        items: result.items.map((item: any) => enrichOrderWithCurrency(item, tenantCurrency)),
      }
    }
    return result
  }

  app.use('/orders', optionalAuth)
  app.use('/orders/*', optionalAuth)

  app.post('/orders', async (c) => {
    const customer = c.get('customer')
    const guestSessionId = c.req.header('x-guest-session-id')
    const idempotencyKey = c.req.header('x-idempotency-key')

    if (!customer && !guestSessionId) {
      throw new AppError('Authentication or guest session required', 401, 'authentication-required')
    }

    const payload = placeOrderSchema.parse(await c.req.json())
    const normalizedPayload = {
      ...payload,
      shippingAddress: payload.shippingAddress ? normalizeAddress(payload.shippingAddress) : undefined,
      billingAddress: payload.billingAddress ? normalizeAddress(payload.billingAddress) : undefined,
    }
    const tenant = c.get('tenant')

    const result = await service.placeOrderForOwner(
      tenant,
      customer ? { customerId: customer.customerId } : { guestSessionId: guestSessionId! },
      normalizedPayload,
      customer ? { customerId: customer.customerId, email: customer.email } : undefined,
      idempotencyKey,
    )
    return c.json(
      {
        data: {
          ...result,
          order: enrichOrderWithCurrency(result.order, tenant.config.currency),
        },
      },
      201,
    )
  })

  app.get('/orders', authRequired, async (c) => {
    const query = listOrdersQuerySchema.parse(c.req.query())
    const result = await service.listMyOrders(c.get('tenant').tenantId, c.get('customer')!.customerId, query.status)
    return c.json({ data: enrichOrderListWithCurrency(result, c.get('tenant').config.currency) })
  })

  app.get('/orders/track', async (c) => {
    const order = await service.trackGuestOrder(c.get('tenant').tenantId, orderTrackQuerySchema.parse(c.req.query()).token)
    return c.json({ data: enrichOrderWithCurrency(order, c.get('tenant').config.currency) })
  })

  app.get('/orders/group/:checkoutGroupId', async (c) => {
    const checkoutGroupId = c.req.param('checkoutGroupId')
    const customer = c.get('customer')
    const ordersList = await service.getOrdersByCheckoutGroupId(
      c.get('tenant').tenantId,
      checkoutGroupId,
      customer ? { customerId: customer.customerId } : undefined,
    )
    return c.json({ data: enrichOrderListWithCurrency(ordersList, c.get('tenant').config.currency) })
  })

  app.get('/orders/:id', authRequired, async (c) => {
    const order = await service.getMyOrder(
      c.get('tenant').tenantId,
      c.get('customer')!.customerId,
      orderParamsSchema.parse(c.req.param()).id,
    )
    return c.json({
      data: enrichOrderWithCurrency(order, c.get('tenant').config.currency),
    })
  })

  app.post('/orders/:id/cancel', authRequired, async (c) => {
    const order = await service.cancelOrder(
      c.get('tenant').tenantId,
      orderParamsSchema.parse(c.req.param()).id,
      { customerId: c.get('customer')!.customerId, email: c.get('customer')!.email },
      Boolean(c.get('isAdmin') || c.get('isSuperAdmin')),
    )
    return c.json({
      data: enrichOrderWithCurrency(order, c.get('tenant').config.currency),
    })
  })

  app.get('/admin/orders', async (c) => {
    const customer = c.get('customer')
    if (!c.get('isAdmin') && !c.get('isSuperAdmin') && !customer?.activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
    const query = listOrdersQuerySchema.parse(c.req.query())
    
    // Determine the vendor filter
    let partnerId: string | null | undefined = query.partnerId
    if (partnerId === 'admin') {
      partnerId = null
    }

    // If it's a vendor staff accessing this, force their own partnerId
    if (customer?.activePartnerId && !c.get('isAdmin') && !c.get('isSuperAdmin')) {
      partnerId = customer.activePartnerId
    }

    const result = await service.listAdminOrders(
      c.get('tenant').tenantId, 
      query.status, 
      customer ? { isAdmin: c.get('isAdmin'), isSuperAdmin: c.get('isSuperAdmin'), activePartnerId: customer.activePartnerId } : undefined,
      partnerId,
      query.page,
      query.perPage
    )
    return c.json({
      data: enrichOrderListWithCurrency(result, c.get('tenant').config.currency)
    })
  })

  // The new order table api
  app.get('/admin/orders/list-summary', async (c) => {
    const customer = c.get('customer')
    if (!c.get('isAdmin') && !c.get('isSuperAdmin') && !customer?.activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
    const query = listAdminOrdersQuerySchema.parse(c.req.query())
    
    // Determine the vendor filter
    let partnerId: string | null | undefined = query.partnerId
    if (partnerId === 'admin') {
      partnerId = null
    }

    // If it's a vendor staff accessing this, force their own partnerId
    if (customer?.activePartnerId && !c.get('isAdmin') && !c.get('isSuperAdmin')) {
      partnerId = customer.activePartnerId
    }

    const result = await service.listAdminOrdersSummary(
      c.get('tenant').tenantId,
      {
        status: query.status,
        partnerId,
        page: query.page,
        perPage: query.perPage,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        customerEmail: query.customerEmail,
        timeFilter: query.timeFilter
      },
      customer ? { isAdmin: c.get('isAdmin'), isSuperAdmin: c.get('isSuperAdmin'), activePartnerId: customer.activePartnerId } : undefined
    )
    const tenantCurrency = c.get('tenant').currency || c.get('tenant').config?.currency || 'INR'
    const enriched = enrichOrderListWithCurrency(result, tenantCurrency)
    return c.json({
      data: {
        ...enriched,
        currency: tenantCurrency,
      },
    })
  })

  app.get('/admin/orders/:id', async (c) => {
    const customer = c.get('customer')
    if (!c.get('isAdmin') && !c.get('isSuperAdmin') && !customer?.activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
    const orderId = orderParamsSchema.parse(c.req.param()).id
    const detail = await service.getAdminOrderDetail(
      c.get('tenant').tenantId,
      orderId,
      customer ? { isAdmin: c.get('isAdmin'), isSuperAdmin: c.get('isSuperAdmin'), activePartnerId: customer.activePartnerId } : undefined
    )
    if (!detail) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }
    return c.json({
      data: enrichOrderWithCurrency(detail, c.get('tenant').config.currency),
    })
  })

  app.patch('/admin/orders/:id/status', async (c) => {
    const customer = c.get('customer')
    if (!c.get('isAdmin') && !c.get('isSuperAdmin') && !customer?.activePartnerId) {
      throw new AppError('Admin or vendor access required', 403, 'forbidden')
    }
    const order = await service.updateStatus(
      c.get('tenant').tenantId,
      orderParamsSchema.parse(c.req.param()).id,
      updateOrderStatusSchema.parse(await c.req.json()).status,
      customer
        ? { isAdmin: c.get('isAdmin'), isSuperAdmin: c.get('isSuperAdmin'), activePartnerId: customer.activePartnerId }
        : undefined,
    )
    return c.json({
      data: enrichOrderWithCurrency(order, c.get('tenant').config.currency),
    })
  })

  return app
}

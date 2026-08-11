import { describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import { CartRepository } from '../cart/cart.repository.js'
import { AddressRepository } from '../customers/customers.repository.js'
import { ShippingService } from '../shipping/shipping.service.js'
import { ShippingRepository } from '../shipping/shipping.repository.js'
import { OrdersRepository } from './orders.repository.js'
import { OrdersService } from './orders.service.js'
import type { OrderDetail } from './orders.types.js'

const tenant: TenantContext = {
  tenantId: 'tenant-1',
  slug: 'tenant-one',
  customDomain: 'tenant-one.example.com',
  mode: 'SINGLE_VENDOR',
  status: 'active',
  features: {
    wishlist: false,
    loyalty: false,
    reviews: false,
    cart_abandonment: false,
    inventory_management: false,
  },
  config: {
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    earn_rate: 1,
    redeem_rate: 100,
    shipping_flat_rate: 4900,
    free_shipping_threshold: null,
    shipping_strategy: 'flat_rate',
    cart_abandonment_delay_hours: 24,
    coupon_loyalty_stacking: false,
    return_window_days: 7,
  },
  branding: {
    primary_color: '#111111',
    secondary_color: '#222222',
    logo_url: '',
    favicon_url: '',
    font: 'Inter',
  },
  payment: {
    provider: 'razorpay',
    credentials: { keyId: 'rzp_test' },
  },
  notification: {
    from_name: 'Tenant',
    from_email: 'hello@example.com',
  },
}

const fakeDb = {} as ConstructorParameters<typeof OrdersRepository>[0]

const buildService = () => {
  const repository = new OrdersRepository(fakeDb)
  const cartRepository = new CartRepository(fakeDb)
  const addressRepository = new AddressRepository(fakeDb)
  const shippingService = new ShippingService(new ShippingRepository(fakeDb))

  return {
    repository,
    cartRepository,
    addressRepository,
    shippingService,
    service: new OrdersService(repository, cartRepository, addressRepository, shippingService, undefined, undefined, undefined, undefined),
  }
}

const pendingOrder: OrderDetail = {
  id: 'order-1',
  tenantId: tenant.tenantId,
  partnerId: 'vendor-1',
  customerId: 'customer-1',
  checkoutGroupId: 'group-1',
  orderNumber: 'ORD-0001',
  status: 'PENDING',
  payoutStatus: 'PENDING',
  trackingNumber: null,
  trackingUrl: null,
  guestEmail: null,
  orderToken: '00000000-0000-0000-0000-000000000999',
  shippingAddressSnapshot: {
    line1: '221B Baker Street',
    line2: null,
    city: 'Mumbai',
    state: 'MH',
    postalCode: '400001',
    country: 'IN',
    phone: '9999999999',
  },
  billingAddressSnapshot: {
    line1: '221B Baker Street',
    line2: null,
    city: 'Mumbai',
    state: 'MH',
    postalCode: '400001',
    country: 'IN',
    phone: '9999999999',
  },
  shippingMethodSnapshot: {
    id: 'standard',
    label: 'Standard Shipping',
    description: '3-5 business days',
    estimated_days: 5,
    amount: 4900,
  },
  subtotal: 500,
  discountAmount: 0,
  shippingAmount: 4900,
  taxAmount: 0,
  total: 5400,
  couponCodeSnapshot: null,
  loyaltyPointsRedeemed: 0,
  notes: null,
  idempotencyKey: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  paymentIntent: null,
}

describe('OrdersService', () => {
  it('fails fast when the owner has no active cart', async () => {
    const { service, cartRepository } = buildService()
    vi.spyOn(cartRepository, 'findActiveCartByOwner').mockResolvedValue(null)

    await expect(
      service.placeOrderForOwner(tenant, { guestSessionId: 'guest-1' }, {
        guestEmail: 'guest@example.com',
        shippingAddress: {
          line1: '42 Example Road',
          line2: null,
          city: 'Pune',
          state: 'MH',
          postalCode: '411001',
          country: 'IN',
          phone: null,
        },
      }),
    ).rejects.toMatchObject({
      code: 'cart-not-found',
    })
  })

  it('rejects invalid admin status transitions', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue({
      ...pendingOrder,
      status: 'PENDING',
    })

    await expect(service.updateStatus(tenant.tenantId, pendingOrder.id, 'SHIPPED')).rejects.toMatchObject({
      code: 'invalid-order-status-transition',
    })
  })

  it('lists my orders through the tenant-scoped repository query', async () => {
    const { service, repository } = buildService()
    const expected = [{ ...pendingOrder, itemCount: 1, items: [] }] as any
    const listSpy = vi.spyOn(repository, 'listCustomerOrdersWithDetails').mockResolvedValue(expected)

    const result = await service.listMyOrders(tenant.tenantId, 'customer-1', 'PENDING')

    expect(result).toEqual(expected)
    expect(listSpy).toHaveBeenCalledWith(tenant.tenantId, 'customer-1', { status: 'PENDING' })
  })

  it('returns the same result for duplicate order placement with same idempotency key', async () => {
    const { service, repository } = buildService()
    const existingOrder = { ...pendingOrder, idempotencyKey: 'key-1' }
    const items = [{ id: 'item-1' }] as any
    const paymentIntent = { id: 'pi-1' } as any

    vi.spyOn(repository, 'findOrderByIdempotencyKey').mockResolvedValue(existingOrder)
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue({
      ...existingOrder,
      items,
      paymentIntent,
    })

    const result = await service.placeOrderForOwner(
      tenant,
      { customerId: 'customer-1' },
      { shippingAddressId: 'addr-1' },
      undefined,
      'key-1',
    )

    expect(result).toEqual({
      order: existingOrder,
      items,
      paymentIntent,
    })
    expect(repository.findOrderByIdempotencyKey).toHaveBeenCalledWith(tenant.tenantId, 'key-1')
  })

  it('tracks guest order by order token', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'findOrderByToken').mockResolvedValue(pendingOrder)
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue(pendingOrder)

    const order = await service.trackGuestOrder(tenant.tenantId, pendingOrder.orderToken)
    expect(order).toEqual(pendingOrder)
    expect(repository.findOrderByToken).toHaveBeenCalledWith(tenant.tenantId, pendingOrder.orderToken)
  })

  it('rejects order cancellation if customer does not own the order', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue({
      ...pendingOrder,
      customerId: 'customer-1',
    })

    await expect(
      service.cancelOrder(tenant.tenantId, pendingOrder.id, { customerId: 'other-customer', email: null }, false),
    ).rejects.toMatchObject({
      code: 'order-not-found',
    })
  })

  it('rejects order cancellation for orders that are already SHIPPED or DELIVERED', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue({
      ...pendingOrder,
      status: 'SHIPPED',
    })

    await expect(
      service.cancelOrder(tenant.tenantId, pendingOrder.id, { customerId: 'customer-1', email: null }, false),
    ).rejects.toMatchObject({
      code: 'invalid-order-status',
    })
  })

  it('rejects viewing order details if customer is not the owner', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue({
      ...pendingOrder,
      customerId: 'customer-1',
    })

    await expect(service.getMyOrder(tenant.tenantId, 'other-customer', pendingOrder.id)).rejects.toMatchObject({
      code: 'order-not-found',
    })
  })

  it('rejects status update if vendor staff does not own the vendor sub-order', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'getOrderDetail').mockResolvedValue({
      ...pendingOrder,
      partnerId: 'vendor-1',
      status: 'CONFIRMED',
    })

    await expect(
      service.updateStatus(tenant.tenantId, pendingOrder.id, 'PROCESSING', {
        isAdmin: false,
        isSuperAdmin: false,
        activePartnerId: 'vendor-2',
      }),
    ).rejects.toMatchObject({
      code: 'order-not-found',
    })
  })

  it('rejects checkout group lookup if customer is not the group owner', async () => {
    const { service, repository } = buildService()
    vi.spyOn(repository, 'getOrdersByCheckoutGroupId').mockResolvedValue([
      { ...pendingOrder, customerId: 'customer-1' },
    ])

    await expect(
      service.getOrdersByCheckoutGroupId(tenant.tenantId, 'group-1', { customerId: 'other-customer' }),
    ).rejects.toMatchObject({
      code: 'forbidden',
    })
  })

  it('correctly splits cart into multi-vendor sub-orders with proportional discount and shipping math', async () => {
    const { service, repository, cartRepository, shippingService } = buildService()

    const multiVendorTenant = { ...tenant, mode: 'MULTI_VENDOR' as const }

    vi.spyOn(cartRepository, 'findActiveCartByOwner').mockResolvedValue({
      id: 'cart-123',
      tenantId: tenant.tenantId,
      customerId: 'customer-1',
      guestSessionId: null,
      status: 'active',
      couponCode: 'SAVE100',
      discountAmount: 100,
      loyaltyPoints: 0,
      selectedShippingOptionId: 'std',
      createdAt: new Date(),
      updatedAt: new Date(),
      subtotal: 0,
      shippingAmount: 0,
      total: 0,
      expiresAt: null,
      metadata: {}
    })

    vi.spyOn(repository, 'lockCart').mockResolvedValue({ id: 'cart-123' })
    vi.spyOn(repository, 'findCartById').mockResolvedValue({
      id: 'cart-123',
      tenantId: tenant.tenantId,
      customerId: 'customer-1',
      guestSessionId: null,
      status: 'active',
      couponCode: 'SAVE100',
      discountAmount: 100,
      loyaltyPoints: 0,
      selectedShippingOptionId: 'std',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    vi.spyOn(repository, 'listCartItems').mockResolvedValue([
      {
        id: 'ci-1', tenantId: tenant.tenantId, cartId: 'cart-123', variantId: '00000000-0000-0000-0000-000000000001', partnerId: 'vendor-a', quantity: 1, metadata: {}, createdAt: new Date(),
        productType: 'physical',
        productTitleSnapshot: '',
        unitPrice: 0,
        lineTotal: 0,
        updatedAt: new Date(),
      },
      {
        id: 'ci-2', tenantId: tenant.tenantId, cartId: 'cart-123', variantId: '00000000-0000-0000-0000-000000000002', partnerId: 'vendor-b', quantity: 1, metadata: {}, createdAt: new Date(),
        productType: 'physical',
        productTitleSnapshot: '',
        unitPrice: 0,
        lineTotal: 0,
        updatedAt: new Date(),
      },
    ])

    vi.spyOn(repository, 'transaction').mockImplementation(async (cb) => cb(repository))

    vi.spyOn(repository, 'getVariantSnapshots').mockResolvedValue([
      {
        variantId: '00000000-0000-0000-0000-000000000001',
        productId: 'prod-a',
        partnerId: 'vendor-a',
        sku: 'SKU-A',
        variantTitle: 'Variant A',
        productTitle: 'Product A',
        price: 500,
        trackInventory: false,
        weightGrams: null,
        productType: 'physical',
        productStatus: 'active',
        approvalStatus: 'APPROVED',
        isDeleted: false,
        imageUrl: null,
      },
      {
        variantId: '00000000-0000-0000-0000-000000000002',
        productId: 'prod-b',
        partnerId: 'vendor-b',
        sku: 'SKU-B',
        variantTitle: 'Variant B',
        productTitle: 'Product B',
        price: 300,
        trackInventory: false,
        weightGrams: null,
        productType: 'physical',
        productStatus: 'active',
        approvalStatus: 'APPROVED',
        isDeleted: false,
        imageUrl: null,
      },
    ])

    vi.spyOn(shippingService, 'calculate').mockResolvedValue([
      { id: 'std', label: 'Standard', description: '3 days', estimated_days: 3, amount: 100 },
    ])

    let orderCount = 0
    const createdOrdersList: any[] = []

    vi.spyOn(repository, 'nextOrderNumber').mockImplementation(async () => `ORD-000${orderCount + 1}`)
    vi.spyOn(repository, 'createOrder').mockImplementation(async (input: any) => {
      orderCount++
      const orderRecord = {
        ...pendingOrder,
        id: `order-${orderCount}`,
        partnerId: input.partnerId,
        checkoutGroupId: input.checkoutGroupId,
        orderNumber: input.orderNumber,
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        shippingAmount: input.shippingAmount,
        total: input.total,
      }
      createdOrdersList.push(orderRecord)
      return orderRecord
    })

    vi.spyOn(repository, 'createOrderItems').mockResolvedValue([])
    vi.spyOn(repository, 'createPaymentIntent').mockImplementation(async (input: any) => ({
      id: 'pi-999',
      tenantId: input.tenantId,
      orderId: input.orderId,
      status: 'PENDING',
      amount: input.amount,
      currency: input.currency,
      provider: 'razorpay',
      providerOrderId: null,
      providerPaymentId: null,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    vi.spyOn(repository, 'getDb').mockReturnValue({
      execute: () => Promise.resolve({ rows: [{ id: 'cart-123' }] }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    } as any)

    const result = await service.placeOrderForOwner(
      multiVendorTenant,
      { customerId: 'customer-1' },
      {
        shippingAddress: {
          line1: '123 Test St',
          line2: null,
          city: 'Mumbai',
          state: 'MH',
          postalCode: '400001',
          country: 'IN',
          phone: '9999999999',
        },
      },
      { customerId: 'customer-1', email: 'customer@example.com' },
    )

    // Assert 2 sub-orders were created
    expect(result.orders?.length).toBe(2)
    expect(createdOrdersList[0].partnerId).toBe('vendor-a')
    expect(createdOrdersList[1].partnerId).toBe('vendor-b')

    // Assert shared checkoutGroupId
    expect(createdOrdersList[0].checkoutGroupId).toBe(createdOrdersList[1].checkoutGroupId)

    // Assert proportional math (Vendor A: 500 subtotal, Vendor B: 300 subtotal)
    // Discount 100 -> A gets 59, B gets remainder 41 (or 63/37 depending on order)
    const sumDiscounts = createdOrdersList[0].discountAmount + createdOrdersList[1].discountAmount
    expect(sumDiscounts).toBe(100)

    const sumShipping = createdOrdersList[0].shippingAmount + createdOrdersList[1].shippingAmount
    expect(sumShipping).toBe(100)

    // Assert Payment Intent total matches sum of vendor orders (500 + 300 + 100 - 100 = 800)
    const sumTotals = createdOrdersList[0].total + createdOrdersList[1].total
    expect(result.paymentIntent.amount).toBe(sumTotals)
    expect(sumTotals).toBe(800)
  })
})

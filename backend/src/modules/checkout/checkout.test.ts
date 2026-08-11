import { describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import { CheckoutRepository } from './checkout.repository.js'
import { CheckoutService } from './checkout.service.js'

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

const fakeDb = {} as any

describe('CheckoutService', () => {
  it('creates a checkout session for direct items', async () => {
    const repository = new CheckoutRepository(fakeDb)
    const ordersService = {} as any
    const shippingService = {} as any

    vi.spyOn(repository, 'createCheckout').mockImplementation(async (input: any) => ({
      ...input,
      id: 'checkout-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const service = new CheckoutService(repository, ordersService, shippingService)

    const result = await service.initiateCheckout(tenant, {
      items: [{ variantId: 'variant-1', quantity: 2 }],
      guestEmail: 'test@example.com',
    })

    expect(result.id).toBe('checkout-1')
    expect(result.status).toBe('CREATED')
    expect(result.guestEmail).toBe('test@example.com')
  })

  it('rejects checkout initiation without cartId or items', async () => {
    const repository = new CheckoutRepository(fakeDb)
    const ordersService = {} as any
    const shippingService = {} as any

    const service = new CheckoutService(repository, ordersService, shippingService)

    await expect(service.initiateCheckout(tenant, {})).rejects.toMatchObject({
      code: 'checkout-items-empty',
    })
  })
})

import { describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import { InMemoryCacheProvider } from '../../providers/cache/in-memory-cache.provider.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import type { CartExpiryJobScheduler } from './cart.jobs.js'
import { CartService } from './cart.service.js'
import type { CartRepository } from './cart.repository.js'
import type { CartRecord, CartVariantSnapshot } from './cart.types.js'
import type { InventoryService } from '../inventory/inventory.service.js'
import type { ShippingService } from '../shipping/shipping.service.js'

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
    shipping_flat_rate: 50,
    free_shipping_threshold: null,
    shipping_strategy: 'flat_rate',
    cart_abandonment_delay_hours: 24,
    coupon_loyalty_stacking: false,
    return_window_days: 7,
  },
  branding: {
    primary_color: '#000',
    secondary_color: '#fff',
    logo_url: '',
    favicon_url: '',
    font: 'sans',
  },
  payment: {
    provider: 'razorpay',
    credentials: {},
  },
  notification: {
    from_name: 'Store',
    from_email: 'store@example.com',
  },
}

const cart: CartRecord = {
  id: '00000000-0000-0000-0000-000000000100',
  tenantId: tenant.tenantId,
  customerId: '00000000-0000-0000-0000-000000000200',
  guestSessionId: null,
  couponCode: null,
  loyaltyPoints: 0,
  status: 'active',
  selectedShippingOptionId: null,
  subtotal: 500,
  shippingAmount: 50,
  discountAmount: 0,
  total: 550,
  expiresAt: new Date(),
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

const snapshot: CartVariantSnapshot = {
  variantId: '00000000-0000-0000-0000-000000000300',
  tenantId: tenant.tenantId,
  productId: '00000000-0000-0000-0000-000000000400',
  partnerId: '00000000-0000-0000-0000-000000000500',
  sku: 'SKU-1',
  title: 'Default',
  productTitle: 'Coffee Mug',
  price: 600,
  productType: 'physical',
  trackInventory: true,
  weightGrams: 250,
  productStatus: 'active',
  isDeleted: false,
}

describe('CartService', () => {
  it('reports price change notices at checkout', async () => {
    const inventoryRow = {
      id: 'inv-1',
      tenantId: tenant.tenantId,
      partnerId: null,
      variantId: snapshot.variantId,
      quantityAvailable: 0,
      quantityReserved: 1,
      quantitySold: 0,
      allowBackorder: false,
      lowStockThreshold: 1,
      locationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const repository = {
      transaction: vi.fn().mockImplementation(async (callback) => callback(repository)),
      getDb: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue({ rows: [inventoryRow] }),
      }),
      findActiveCartByOwner: vi.fn().mockResolvedValue(cart),
      lockCart: vi.fn().mockResolvedValue(cart),
      findCartById: vi.fn().mockResolvedValue(cart),
      listCartItems: vi.fn().mockResolvedValue([
        {
          id: '00000000-0000-0000-0000-000000000500',
          tenantId: tenant.tenantId,
          cartId: cart.id,
          variantId: snapshot.variantId,
          partnerId: null,
          productType: 'physical',
          productTitleSnapshot: 'Coffee Mug',
          quantity: 1,
          unitPrice: 500,
          metadata: {},
          lineTotal: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      getVariantSnapshots: vi.fn().mockResolvedValue([snapshot]),
      updateCart: vi.fn().mockResolvedValue({ ...cart, selectedShippingOptionId: 'standard' }),
      updateCartItem: vi.fn().mockResolvedValue(undefined),
    } as unknown as CartRepository

    const inventory = {} as unknown as InventoryService

    const shipping = {
      calculate: vi.fn().mockResolvedValue([
        { id: 'standard', label: 'Standard', description: '3-5 days', estimated_days: 5, amount: 50 },
      ]),
      selectOption: vi.fn().mockReturnValue({
        id: 'standard',
        label: 'Standard',
        description: '3-5 days',
        estimated_days: 5,
        amount: 50,
      }),
    } as unknown as ShippingService

    const scheduler: CartExpiryJobScheduler = {
      upsertExpiryJob: vi.fn(),
      removeExpiryJob: vi.fn(),
    }
    const events: EventPublisher = { publish: vi.fn() }
    const service = new CartService(repository, inventory, shipping, new InMemoryCacheProvider(), scheduler, events)

    const result = await service.checkout(tenant, { customerId: cart.customerId! }, {})

    expect(result.notices).toEqual([
      {
        type: 'price_changed',
        itemId: '00000000-0000-0000-0000-000000000500',
        variantId: snapshot.variantId,
        oldUnitPrice: 500,
        newUnitPrice: 600,
      },
    ])
    expect(vi.mocked(repository.getDb)).toHaveBeenCalled()
  })

  it('publishes cart.expired event when cart expires', async () => {
    const repository = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(repository)),
      getDb: vi.fn().mockReturnValue({}),
      lockCart: vi.fn().mockResolvedValue(cart),
      listCartItems: vi.fn().mockResolvedValue([]),
      getVariantSnapshots: vi.fn().mockResolvedValue([]),
      updateCart: vi.fn().mockResolvedValue({ ...cart, status: 'expired' }),
    } as unknown as CartRepository

    const events: EventPublisher = { publish: vi.fn() }
    const service = new CartService(
      repository,
      {} as unknown as InventoryService,
      {} as unknown as ShippingService,
      new InMemoryCacheProvider(),
      undefined,
      events,
    )

    await service.expireCart({ tenantId: cart.tenantId, cartId: cart.id })

    expect(events.publish).toHaveBeenCalledWith('cart.expired', {
      tenantId: cart.tenantId,
      cartId: cart.id,
    })
  })

  it('cleans up expired active carts via daily batch cleanup', async () => {
    const expiredCart1 = { ...cart, id: 'cart-expired-1' }
    const repository = {
      findExpiredActiveCarts: vi.fn().mockResolvedValue([expiredCart1]),
      transaction: vi.fn().mockImplementation(async (cb) => cb(repository)),
      getDb: vi.fn().mockReturnValue({}),
      lockCart: vi.fn().mockResolvedValue(expiredCart1),
      listCartItems: vi.fn().mockResolvedValue([]),
      getVariantSnapshots: vi.fn().mockResolvedValue([]),
      updateCart: vi.fn().mockResolvedValue({ ...expiredCart1, status: 'expired' }),
    } as unknown as CartRepository



    const events: EventPublisher = { publish: vi.fn() }
    const service = new CartService(
      repository,
      {} as unknown as InventoryService,
      {} as unknown as ShippingService,
      new InMemoryCacheProvider(),
      undefined,
      events,
    )

    const result = await service.cleanupExpiredCarts(10)

    expect(result).toEqual({ processed: 1 })
    expect(repository.findExpiredActiveCarts).toHaveBeenCalledWith(10)
    expect(events.publish).toHaveBeenCalledWith('cart.expired', {
      tenantId: cart.tenantId,
      cartId: 'cart-expired-1',
    })
  })
})


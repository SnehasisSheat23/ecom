import { describe, expect, it, vi } from 'vitest'

import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import { ShippingService } from './shipping.service.js'
import type { ShippingRepository } from './shipping.repository.js'
import { shippingZones, shippingMethods } from './shipping.schema.js'

const mockRepo = {
  listActiveMethods: vi.fn().mockResolvedValue([]),
  findDefaultZone: vi.fn(),
} as unknown as ShippingRepository

const tenantFixture: TenantContext = {
  tenantId: 'tenant-1',
  slug: 'tenant-1',
  customDomain: 'tenant-1.example.com',
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
    shipping_flat_rate: 4900,
    free_shipping_threshold: 50000,
    shipping_strategy: 'flat_rate',
    earn_rate: 1,
    redeem_rate: 100,
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

const physicalItem = {
  variant_id: 'variant-1',
  quantity: 1,
  unit_price: 30000,
  weight_grams: 500,
  product_type: 'physical' as const,
  partner_id: null,
}

describe('ShippingService', () => {
  it('returns a standard flat-rate option (fallback)', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      items: [
        {
          variant_id: 'variant-1',
          quantity: 2,
          unit_price: 15000,
          weight_grams: 500,
          product_type: 'physical',
          partner_id: null,
        },
      ],
    })

    expect(result).toEqual([
      {
        id: 'standard',
        label: 'Standard Shipping',
        description: '3-5 business days',
        estimated_days: 5,
        amount: 4900,
      },
    ])
  })

  it('returns multiple options from the database', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([
      { id: 'opt-1', name: 'Standard', flatRate: 5000, estimatedDays: 5 } as any,
      { id: 'opt-2', name: 'Express', flatRate: 15000, estimatedDays: 1 } as any,
    ])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      items: [physicalItem],
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'opt-1', label: 'Standard', amount: 5000 })
    expect(result[1]).toMatchObject({ id: 'opt-2', label: 'Express', amount: 15000 })
  })

  it('applies free shipping threshold to multiple database options', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([
      { id: 'opt-1', name: 'Standard', flatRate: 5000, estimatedDays: 5 } as any,
      { id: 'opt-2', name: 'Express', flatRate: 15000, estimatedDays: 1 } as any,
    ])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      subtotal: 60000, // Above 50000 threshold
      items: [physicalItem],
    })

    expect(result[0]?.amount).toBe(0)
    expect(result[1]?.amount).toBe(0)
  })

  it('returns free shipping when subtotal meets the threshold (fallback)', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      subtotal: 50000,
      items: [
        {
          variant_id: 'variant-1',
          quantity: 1,
          unit_price: 50000,
          weight_grams: 500,
          product_type: 'physical',
          partner_id: null,
        },
      ],
    })

    expect(result[0]?.amount).toBe(0)
  })

  it('returns digital delivery for digital-only orders', async () => {
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      items: [
        {
          variant_id: 'variant-1',
          quantity: 1,
          unit_price: 1000,
          weight_grams: null,
          product_type: 'digital',
          partner_id: null,
        },
      ],
    })

    expect(result).toEqual([
      {
        id: 'digital',
        label: 'Digital Delivery',
        description: 'Instant',
        estimated_days: 0,
        amount: 0,
      },
    ])
  })

  it('supports estimation mode with no address', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.estimateFromQuery(tenantFixture, { subtotal: 30000 })

    expect(result[0]?.id).toBe('standard')
    expect(result[0]?.amount).toBe(4900)
  })

  it('charges flat rate when free shipping threshold is null (fallback)', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: {
        ...tenantFixture,
        config: {
          ...tenantFixture.config,
          free_shipping_threshold: null,
        },
      },
      address: null,
      subtotal: 999999,
      items: [physicalItem],
    })

    expect(result[0]?.amount).toBe(4900)
  })

  it('returns free standard shipping when flat rate is zero (fallback)', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: {
        ...tenantFixture,
        config: {
          ...tenantFixture.config,
          shipping_flat_rate: 0,
          free_shipping_threshold: null,
        },
      },
      address: null,
      items: [physicalItem],
    })

    expect(result).toEqual([
      {
        id: 'standard',
        label: 'Standard Shipping',
        description: '3-5 business days',
        estimated_days: 5,
        amount: 0,
      },
    ])
  })

  it('returns flat-rate estimation for an empty items array (fallback)', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      subtotal: 0,
      items: [],
    })

    expect(result[0]?.id).toBe('standard')
    expect(result[0]?.amount).toBe(4900)
  })

  it('returns 501 for non-supported strategies', async () => {
    const service = new ShippingService(mockRepo)

    await expect(
      service.calculate({
        tenant: {
          ...tenantFixture,
          config: {
            ...tenantFixture.config,
            shipping_strategy: 'unsupported_dummy_strategy' as any,
          },
        },
        address: null,
        items: [physicalItem],
      }),
    ).rejects.toMatchObject({
      statusCode: 501,
      code: 'shipping-strategy-not-implemented',
    })
  })

  it('auto-selects the first option when no shipping option id is provided', () => {
    const service = new ShippingService(mockRepo)

    const selected = service.selectOption(
      [
        {
          id: 'standard',
          label: 'Standard Shipping',
          description: '3-5 business days',
          estimated_days: 5,
          amount: 4900,
        },
      ],
      undefined,
    )

    expect(selected?.id).toBe('standard')
  })

  it('rejects unknown shipping option ids', () => {
    const service = new ShippingService(mockRepo)

    expect(() =>
      service.selectOption(
        [{ id: 'standard', label: 'Standard', description: '', estimated_days: 5, amount: 4900 }],
        'express',
      ),
    ).toThrowError(/Selected shipping option not found/)
  })

  it('matches correct zone using pincodes wildcard match (e.g. 110*)', async () => {
    const zonesList = [
      { id: 'zone-delhi', tenantId: 'tenant-1', name: 'Delhi Zone', countries: ['IN'], pincodes: ['110*'], isDefault: false },
      { id: 'zone-default', tenantId: 'tenant-1', name: 'Default Zone', countries: ['IN'], pincodes: [], isDefault: true }
    ]
    const methodsList = [
      { id: 'method-delhi', tenantId: 'tenant-1', name: 'Delhi Same Day', zoneId: 'zone-delhi', flatRate: 5000, estimatedDays: 1 },
      { id: 'method-default', tenantId: 'tenant-1', name: 'Standard Delivery', zoneId: 'zone-default', flatRate: 2000, estimatedDays: 4 }
    ]

    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        return {
          from: vi.fn().mockImplementation((table) => {
            return {
              where: vi.fn().mockImplementation(() => {
                if (table === shippingZones) {
                  return Promise.resolve(zonesList)
                }
                return {
                  orderBy: vi.fn().mockResolvedValue([methodsList[0]])
                }
              }),
              limit: vi.fn().mockResolvedValue([zonesList[1]])
            }
          })
        }
      })
    } as any

    const service = new ShippingService(mockRepo, undefined, mockDb)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: { postal_code: '110001', country_code: 'IN' },
      items: [physicalItem],
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'method-delhi',
      label: 'Delhi Same Day',
      amount: 5000
    })
  })

  it('queries live carrier rates when strategy is carrier_api', async () => {
    const mockDeliveryService = {
      getActiveConfig: vi.fn().mockResolvedValue({
        id: 'cfg-1',
        provider: 'delhivery',
        credentials: { authToken: 'test-token' }
      }),
      getProvider: vi.fn().mockReturnValue({
        calculateRates: vi.fn().mockResolvedValue([
          { id: 'delhivery-express', label: 'Delhivery Express', amount: 4500, estimatedDays: 2 }
        ])
      })
    } as any

    const service = new ShippingService(mockRepo, mockDeliveryService)

    const result = await service.calculate({
      tenant: {
        ...tenantFixture,
        config: {
          ...tenantFixture.config,
          shipping_strategy: 'carrier_api',
        }
      },
      address: { postal_code: '110001', country_code: 'IN' },
      items: [physicalItem],
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'delhivery-express',
      label: 'Delhivery Express',
      amount: 4500
    })
  })

  it('calculates consolidated rate for multi-vendor cart (sums amounts and takes slowest TAT)', async () => {
    const zonesList = [
      { id: 'zone-default', tenantId: 'tenant-1', name: 'Default Zone', countries: ['IN'], pincodes: [], isDefault: true }
    ]
    const methodsList = [
      { id: 'method-1', tenantId: 'tenant-1', name: 'Standard Delivery', zoneId: 'zone-default', flatRate: 3500, estimatedDays: 4, partnerId: 'vendor-A' },
      { id: 'method-2', tenantId: 'tenant-1', name: 'Express Delivery', zoneId: 'zone-default', flatRate: 7000, estimatedDays: 2, partnerId: 'vendor-A' },
      { id: 'method-3', tenantId: 'tenant-1', name: 'Standard Delivery', zoneId: 'zone-default', flatRate: 2000, estimatedDays: 5, partnerId: 'vendor-B' }
    ]

    let callCount = 0
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        return {
          from: vi.fn().mockImplementation((table) => {
            return {
              where: vi.fn().mockImplementation(() => {
                if (table === shippingZones) {
                  return Promise.resolve(zonesList)
                }
                callCount++
                if (callCount === 1) {
                  return {
                    orderBy: vi.fn().mockResolvedValue([methodsList[0], methodsList[1]])
                  }
                } else {
                  return {
                    orderBy: vi.fn().mockResolvedValue([methodsList[2]])
                  }
                }
              }),
              limit: vi.fn().mockResolvedValue([zonesList[0]])
            }
          })
        }
      })
    } as any

    const service = new ShippingService(mockRepo, undefined, mockDb)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: { postal_code: '110001', country_code: 'IN' },
      items: [
        {
          variant_id: 'variant-A',
          quantity: 1,
          unit_price: 10000,
          weight_grams: 500,
          product_type: 'physical',
          partner_id: 'vendor-A',
        },
        {
          variant_id: 'variant-B',
          quantity: 1,
          unit_price: 5000,
          weight_grams: 300,
          product_type: 'physical',
          partner_id: 'vendor-B',
        }
      ],
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 'standard',
      label: 'Standard Shipping',
      amount: 5500,
      estimated_days: 5
    })
    expect(result[1]).toMatchObject({
      id: 'express',
      label: 'Express Shipping',
      amount: 9000,
      estimated_days: 5
    })
  })

  it('calculates volumetric weight when dimensions exceed actual dead weight', () => {
    const service = new ShippingService(mockRepo)
    // Box: 50cm x 40cm x 30cm = 60,000 cm3 / 5000 = 12 kg (12,000g)
    // Actual dead weight = 500g
    const item = {
      variant_id: 'v1',
      quantity: 1,
      unit_price: 5000,
      weight_grams: 500,
      length_cm: 50,
      width_cm: 40,
      height_cm: 30,
      product_type: 'physical' as const,
      partner_id: null,
    }

    const itemWeight = service.calculateItemBillableWeightGrams(item)
    expect(itemWeight).toBe(12000)

    const pkgWeight = service.calculatePackageBillableWeightGrams([item])
    expect(pkgWeight).toBe(12000)
  })

  it('filters methods based on minWeightG and maxWeightG constraints', async () => {
    const zonesList = [
      { id: 'zone-default', tenantId: 'tenant-1', name: 'Default Zone', countries: ['IN'], pincodes: [], isDefault: true }
    ]
    const methodsList = [
      { id: 'light-method', tenantId: 'tenant-1', name: 'Light Parcel', flatRate: 1000, minWeightG: 0, maxWeightG: 1000, estimatedDays: 3 },
      { id: 'heavy-method', tenantId: 'tenant-1', name: 'Heavy Freight', flatRate: 8000, minWeightG: 1001, maxWeightG: 50000, estimatedDays: 7 }
    ]

    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table) => ({
          where: vi.fn().mockImplementation(() => {
            if (table === shippingZones) return Promise.resolve(zonesList)
            return {
              orderBy: vi.fn().mockResolvedValue(methodsList)
            }
          }),
          limit: vi.fn().mockResolvedValue([zonesList[0]])
        }))
      }))
    } as any

    const service = new ShippingService(mockRepo, undefined, mockDb)

    // Item: 3,000g actual weight -> Should match heavy-method only
    const result = await service.calculate({
      tenant: tenantFixture,
      address: { postal_code: '110001', country_code: 'IN' },
      items: [
        {
          variant_id: 'v-heavy',
          quantity: 1,
          unit_price: 10000,
          weight_grams: 3000,
          product_type: 'physical',
          partner_id: null,
        }
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'heavy-method',
      label: 'Heavy Freight',
      amount: 8000
    })
  })

  it('runs cleanly without marketplace module or partner service (standalone decoupled execution)', async () => {
    vi.mocked(mockRepo.listActiveMethods).mockResolvedValueOnce([])
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: tenantFixture,
      address: null,
      items: [
        {
          variant_id: 'variant-standalone',
          quantity: 1,
          unit_price: 2000,
          weight_grams: 200,
          product_type: 'physical',
          partner_id: null,
        },
      ],
    })

    expect(result).toEqual([
      {
        id: 'standard',
        label: 'Standard Shipping',
        description: '3-5 business days',
        estimated_days: 5,
        amount: 4900,
      },
    ])
  })
})


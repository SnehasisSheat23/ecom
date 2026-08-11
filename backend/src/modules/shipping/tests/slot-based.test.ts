import { describe, expect, it } from 'vitest'
import type { TenantContext } from '../../../layers/tenancy/tenancy.types.js'
import { ShippingService } from '../shipping.service.js'
import type { ShippingRepository } from '../shipping.repository.js'

const mockRepo = {
  listActiveMethods: async () => [],
  findDefaultZone: async () => null,
} as unknown as ShippingRepository

const slotTenantFixture: TenantContext = {
  tenantId: 'tenant-tfcakes',
  slug: 'tfcakes',
  customDomain: 'tfcakes.in',
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
    shipping_flat_rate: 0,
    free_shipping_threshold: null,
    shipping_strategy: 'slot_based',
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
    from_name: 'TFCakes',
    from_email: 'support@tfcakes.in',
  },
}

describe('SlotBasedStrategy Tests', () => {
  it('returns available slots (Standard, Fixed Time, Midnight) for bakery tenant', async () => {
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: slotTenantFixture,
      address: { postal_code: '110001', country_code: 'IN' },
      deliveryDate: '2026-12-25', // Future date -> all slots available
      items: [
        {
          variant_id: 'cake-variant-1',
          quantity: 1,
          unit_price: 120000,
          weight_grams: 1000,
          product_type: 'physical',
          partner_id: null,
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('slot-option')
    expect(result[0].slots).toBeDefined()
    expect(result[0].slots).toHaveLength(3)

    const midnightSlot = result[0].slots?.find((s) => s.id === 'midnight-slot')
    expect(midnightSlot).toBeDefined()
    expect(midnightSlot?.surcharge).toBe(25000) // ₹250 surcharge
    expect(midnightSlot?.isAvailable).toBe(true)
  })

  it('applies surcharge when a specific slotId is selected at checkout', async () => {
    const service = new ShippingService(mockRepo)

    const result = await service.calculate({
      tenant: slotTenantFixture,
      address: { postal_code: '110001', country_code: 'IN' },
      deliveryDate: '2026-12-25',
      selectedSlotId: 'midnight-slot',
      items: [
        {
          variant_id: 'cake-variant-1',
          quantity: 1,
          unit_price: 120000,
          weight_grams: 1000,
          product_type: 'physical',
          partner_id: null,
        },
      ],
    })

    // Base flat rate (0) + Midnight surcharge (25000) = 25000
    expect(result[0].amount).toBe(25000)
  })
})

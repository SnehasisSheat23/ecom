import { describe, expect, it } from 'vitest'
import { ShippingService } from '../shipping.service.js'
import type { ShippingRepository } from '../shipping.repository.js'

const mockRepo = {
  listActiveMethods: async () => [],
  findDefaultZone: async () => null,
} as unknown as ShippingRepository

describe('Volumetric Weight & Dimension Tests', () => {
  it('calculates volumetric weight when dimensions exceed actual weight', () => {
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

  it('uses actual dead weight when actual weight exceeds volumetric weight', () => {
    const service = new ShippingService(mockRepo)

    // Heavy item: 10kg (10,000g), small box: 10cm x 10cm x 10cm = 1000cm3 / 5000 = 0.2kg (200g)
    const item = {
      variant_id: 'v2',
      quantity: 1,
      unit_price: 5000,
      weight_grams: 10000,
      length_cm: 10,
      width_cm: 10,
      height_cm: 10,
      product_type: 'physical' as const,
      partner_id: null,
    }

    const itemWeight = service.calculateItemBillableWeightGrams(item)
    expect(itemWeight).toBe(10000)
  })
})

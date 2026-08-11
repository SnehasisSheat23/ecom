import type { CalculateShippingInput, ShippingOption } from '../shipping.types.js'
import type { IShippingStrategy, StrategyContext } from './strategy.interface.js'

export class CarrierApiStrategy implements IShippingStrategy {
  readonly name = 'carrier_api'

  async calculate(input: CalculateShippingInput, context: StrategyContext): Promise<ShippingOption[]> {
    const { tenant, subtotal, address } = input
    const { deliveryService, totalBillableWeightGrams, destinationPincode } = context

    if (deliveryService) {
      try {
        const partnerId = input.items[0]?.partner_id ?? null
        const deliveryConfig = await deliveryService.getActiveConfig(tenant.tenantId, partnerId)
        if (deliveryConfig && deliveryConfig.provider !== 'manual') {
          const provider = deliveryService.getProvider(deliveryConfig.provider)
          const originPincode = deliveryConfig.credentials?.pickupPincode || '560001'

          const rates = await provider.calculateRates(deliveryConfig.credentials, {
            originPincode,
            destinationPincode: destinationPincode || address?.postal_code || '110001',
            weightGrams: totalBillableWeightGrams,
            subtotal: subtotal ?? 0,
          })

          if (rates.length > 0) {
            return rates.map((r: { id: string; label: string; amount: number; estimatedDays: number }) => ({
              id: r.id,
              label: r.label,
              description: `${r.estimatedDays} business days`,
              estimated_days: r.estimatedDays,
              amount: r.amount,
            }))
          }
        }
      } catch (err) {
        console.error('[CarrierApiStrategy Error]:', err)
      }
    }

    return []
  }
}

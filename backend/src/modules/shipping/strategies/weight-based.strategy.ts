import type { CalculateShippingInput, ShippingOption } from '../shipping.types.js'
import type { IShippingStrategy, StrategyContext } from './strategy.interface.js'

export class WeightBasedStrategy implements IShippingStrategy {
  readonly name = 'weight_based'

  async calculate(input: CalculateShippingInput, context: StrategyContext): Promise<ShippingOption[]> {
    const { tenant } = input
    const { dbMethods, totalBillableWeightGrams } = context

    if (dbMethods && dbMethods.length > 0) {
      const eligibleMethods = dbMethods.filter((m) => {
        if (m.minWeightG !== null && m.minWeightG !== undefined && totalBillableWeightGrams < m.minWeightG) {
          return false
        }
        if (m.maxWeightG !== null && m.maxWeightG !== undefined && totalBillableWeightGrams > m.maxWeightG) {
          return false
        }
        return true
      })

      const activeList = eligibleMethods.length > 0 ? eligibleMethods : dbMethods

      return activeList.map((method) => {
        let amount = method.flatRate ?? 0
        if (method.strategy === 'weight_based' || method.strategy === 'rate_per_kg') {
          const weightKg = Math.ceil(totalBillableWeightGrams / 1000)
          amount += weightKg * (method.ratePerKg ?? 0)
        }
        return {
          id: method.id,
          label: method.name,
          description: `${method.estimatedDays} business days`,
          estimated_days: method.estimatedDays,
          amount,
        }
      })
    }

    const weightKg = Math.ceil(totalBillableWeightGrams / 1000)
    const baseAmount = tenant.config.shipping_flat_rate
    const amount = Math.round(baseAmount * (weightKg > 0 ? weightKg : 1))

    return [
      {
        id: 'weight-standard',
        label: 'Standard Weight Shipping',
        description: '3-5 business days',
        estimated_days: 5,
        amount,
      },
    ]
  }
}

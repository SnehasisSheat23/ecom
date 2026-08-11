import type { CalculateShippingInput, ShippingOption } from '../shipping.types.js'
import type { IShippingStrategy, StrategyContext } from './strategy.interface.js'

export class FlatRateStrategy implements IShippingStrategy {
  readonly name = 'flat_rate'

  async calculate(input: CalculateShippingInput, context: StrategyContext): Promise<ShippingOption[]> {
    const { tenant } = input
    const { dbMethods } = context

    if (dbMethods && dbMethods.length > 0) {
      return dbMethods.map((method) => ({
        id: method.id,
        label: method.name,
        description: `${method.estimatedDays} business days`,
        estimated_days: method.estimatedDays,
        amount: method.flatRate ?? 0,
        slots: method.slots || [],
      }))
    }

    const amount = tenant.config.shipping_flat_rate
    return [
      {
        id: 'standard',
        label: 'Standard Shipping',
        description: '3-5 business days',
        estimated_days: 5,
        amount,
      },
    ]
  }
}

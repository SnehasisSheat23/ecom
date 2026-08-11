import type { CalculateShippingInput, ShippingOption } from '../shipping.types.js'

export interface StrategyContext {
  dbMethods?: any[]
  totalBillableWeightGrams: number
  deliveryService?: any
  destinationPincode?: string | null
}

export interface IShippingStrategy {
  name: string
  calculate(input: CalculateShippingInput, context: StrategyContext): Promise<ShippingOption[]>
}

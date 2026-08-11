import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'

export type ShippingStrategy = TenantContext['config']['shipping_strategy']

export interface AvailableSlotInfo {
  id: string
  label: string
  timeWindow: string
  cutoffTime: string
  surcharge: number
  isAvailable: boolean
}

export interface ShippingOption {
  id: string
  label: string
  description: string
  estimated_days: number
  amount: number
  partner_id?: string
  slots?: AvailableSlotInfo[]
}

export interface CartItemForShipping {
  variant_id: string
  quantity: number
  unit_price: number
  weight_grams: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  product_type: 'physical' | 'digital'
  partner_id: string | null
}

export interface ShippingAddress {
  id?: string
  country_code?: string | null
  postal_code?: string | null
  city?: string | null
  state?: string | null
}

export interface CalculateShippingInput {
  items: CartItemForShipping[]
  address: ShippingAddress | null
  tenant: TenantContext
  deliveryDate?: string
  selectedSlotId?: string
  subtotal?: number
  metadata?: Record<string, unknown>
}

export interface ShippingEstimateQuery {
  subtotal?: number
  isDigitalOnly?: boolean
  addressId?: string
}

export interface PricingCartLine {
  variantId: string
  quantity: number
  unitPrice: number
  weightGrams?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  productType: 'physical' | 'digital'
  partnerId?: string | null
}

export interface PricingCart {
  items: PricingCartLine[]
  subtotal?: number
}

export interface OrderTotal {
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  shippingOptions: ShippingOption[]
  selectedShippingOptionId: string | null
}

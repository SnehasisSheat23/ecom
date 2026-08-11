import type { ProductType } from '../catalog/catalog.types.js'
import type { ShippingOption } from '../shipping/shipping.types.js'

export type CartStatus = 'active' | 'expired' | 'converted'
export type CartOwner = { customerId: string; guestSessionId?: undefined } | { guestSessionId: string; customerId?: undefined }
export type CreateCartInput = CartOwner & {
  metadata?: Record<string, unknown>
}

export interface CartRecord {
  id: string
  tenantId: string
  customerId: string | null
  guestSessionId: string | null
  couponCode: string | null
  loyaltyPoints: number
  status: CartStatus
  selectedShippingOptionId: string | null
  subtotal: number
  shippingAmount: number
  discountAmount: number
  total: number
  expiresAt: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CartItemRecord {
  id: string
  tenantId: string
  cartId: string
  variantId: string
  partnerId: string | null
  productType: ProductType
  productTitleSnapshot: string
  quantity: number
  unitPrice: number
  metadata: Record<string, unknown>
  lineTotal: number
  createdAt: Date
  updatedAt: Date
}

export interface CartVariantSnapshot {
  variantId: string
  tenantId: string
  productId: string
  partnerId: string
  sku: string
  title: string
  productTitle: string
  price: number
  productType: ProductType
  trackInventory: boolean
  weightGrams: number | null
  productStatus: 'draft' | 'active' | 'archived'
  isDeleted: boolean
}

export interface AddCartItemInput {
  variantId: string
  quantity: number
  metadata?: Record<string, unknown>
}

export interface UpdateCartItemInput {
  quantity: number
}

export interface CheckoutInput {
  selectedShippingOptionId?: string
}

export interface CartPriceNotice {
  type: 'price_changed'
  itemId: string
  variantId: string
  oldUnitPrice: number
  newUnitPrice: number
}

export interface CartCheckoutResult {
  cart: CartView
  notices: CartPriceNotice[]
}

export interface CartLineView {
  id: string
  variantId: string
  partnerId: string | null
  productType: ProductType
  productTitle: string
  quantity: number
  unitPrice: number
  currentUnitPrice: number
  metadata: Record<string, unknown>
  lineTotal: number
  priceChanged: boolean
}

export interface CartView {
  id: string
  customerId: string | null
  guestSessionId: string | null
  couponCode: string | null
  loyaltyPoints: number
  status: CartStatus
  metadata: Record<string, unknown>
  subtotal: number
  shippingAmount: number
  discountAmount: number
  taxAmount: number
  total: number
  expiresAt: string | null
  selectedShippingOptionId: string | null
  shippingOptions: ShippingOption[]
  items: CartLineView[]
}

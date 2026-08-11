import type { checkouts, checkoutGroups } from './checkout.schema.js'

export type CheckoutStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'EXPIRED'

export type CheckoutGroupStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'

export type CheckoutRecord = typeof checkouts.$inferSelect
export type CheckoutGroupRecord = typeof checkoutGroups.$inferSelect

export interface InitiateCheckoutInput {
  cartId?: string
  items?: Array<{
    variantId: string
    quantity: number
    metadata?: Record<string, unknown>
  }>
  guestEmail?: string
  shippingAddress?: Record<string, unknown>
  billingAddress?: Record<string, unknown>
  couponCode?: string
  notes?: string
}

export interface SelectShippingInput {
  shippingOptionId: string
}

export interface CompleteCheckoutInput {
  paymentMethod: string
  notes?: string
}

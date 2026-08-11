import { PaginatedResult } from '../../lib/types.js'
import type { Address } from '../customers/customers.types.js'
import type { ShippingOption } from '../shipping/shipping.types.js'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface AddressSnapshot {
  fullName?: string | null
  label?: string | null
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone: string | null
}

export interface CreateOrderInput {
  items?: Array<{ variantId: string; quantity: number; metadata?: Record<string, unknown> }>
  shippingAddressId?: string
  billingAddressId?: string
  shippingAddress?: AddressSnapshot
  billingAddress?: AddressSnapshot
  guestEmail?: string
  selectedShippingOptionId?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export interface OrderRecord {
  id: string
  tenantId: string
  partnerId: string
  customerId: string | null
  checkoutGroupId: string
  orderNumber: string
  status: OrderStatus
  payoutStatus: string
  trackingNumber: string | null
  trackingUrl: string | null
  guestEmail: string | null
  orderToken: string
  shippingAddressSnapshot: AddressSnapshot
  billingAddressSnapshot: AddressSnapshot | null
  shippingMethodSnapshot: ShippingOption | null
  subtotal: number
  discountAmount: number
  shippingAmount: number
  taxAmount: number
  total: number
  couponCodeSnapshot: string | null
  loyaltyPointsRedeemed: number
  notes: string | null
  idempotencyKey: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface OrderItemRecord {
  id: string
  tenantId: string
  orderId: string
  productId: string
  variantId: string
  partnerId: string | null
  productTitle: string
  variantTitle: string
  sku: string
  unitPrice: number
  quantity: number
  lineTotal: number
  imageUrl: string | null
  metadata: Record<string, unknown>
  returnStatus: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED'
  createdAt: Date
}

export interface PaymentIntentRecord {
  id: string
  tenantId: string
  orderId: string
  status: 'PENDING' | 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  amount: number
  currency: string
  provider: string | null
  providerOrderId: string | null
  providerPaymentId: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface PlaceOrderResult {
  order: OrderRecord
  orders?: OrderRecord[]
  items: OrderItemRecord[]
  paymentIntent: PaymentIntentRecord
}

export interface OrderListItem extends OrderRecord {
  itemCount: number
}

export interface OrderListItemWithDetails extends OrderListItem {
  customerName?: string | null
  customerPhone?: string | null
  items: OrderItemRecord[]
}

export interface CustomerOrderListItem extends OrderListItem {
  items: OrderItemRecord[]
}

export interface OrderDetail extends OrderRecord {
  items: OrderItemRecord[]
  paymentIntent: PaymentIntentRecord | null
}

export interface OrderFilters {
  status?: OrderStatus
  partnerId?: string | null
  page?: number
  perPage?: number
}

export interface OrderListItemSummaryFilters {
  status?: string
  partnerId?: string | null
  page?: number
  perPage?: number
  search?: string
  sortBy?: 'date' | 'total' | 'id'
  sortOrder?: 'asc' | 'desc'
  customerEmail?: string
  customerId?: string
  timeFilter?: 'today' | '7days' | '30days' | 'all'
}

export interface OrderSummaryStats {
  totalOrders: number
  totalRevenue: number
  fulfilledOrders: number
  pendingOrders: number
  cancelledOrders: number
  totalItems: number
}

export interface OrderListItemSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  guestEmail: string | null
  total: number
  createdAt: string
  customerName: string
  customerEmail: string
  customerCity: string
  itemCount: number
  syncMessage?: string
}

export interface OrderVariantSnapshot {
  variantId: string
  productId: string
  partnerId: string
  sku: string
  variantTitle: string
  productTitle: string
  price: number
  trackInventory: boolean
  weightGrams: number | null
  productType: 'physical' | 'digital'
  productStatus: 'draft' | 'active' | 'archived'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  isDeleted: boolean
  imageUrl: string | null
}

export interface PlaceOrderActor {
  customerId: string
  email: string | null
}

export interface OrderLifecycleHooks {
  checkServiceability?(tenantId: string, partnerIds: string[], pincode: string): Promise<boolean>
  onOrderCreated?(orderId: string, tenantId: string): Promise<void>
  onOrderCancelled?(orderId: string, tenantId: string): Promise<void>
}

export const toAddressSnapshot = (address: Address): AddressSnapshot => ({
  label: address.label,
  line1: address.line1,
  line2: address.line2,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  phone: address.phone,
})

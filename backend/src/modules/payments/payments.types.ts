import type { NormalizedEventType, ProviderOrder, RefundResult } from '../../providers/payment/payment.interface.js'
import type { PaymentIntentRecord } from '../orders/orders.types.js'

export interface PaymentEventRecord {
  id: string
  tenantId: string
  paymentIntentId: string | null
  provider: string
  providerEventId: string
  eventType: NormalizedEventType
  paymentId: string | null
  amount: number | null
  currency: string | null
  payload: Record<string, unknown>
  createdAt: Date
}

export interface SanitizedPaymentEvent {
  id: string
  provider: string
  providerEventId: string
  eventType: NormalizedEventType
  paymentId: string | null
  amount: number | null
  currency: string | null
  createdAt: Date
}

export interface SanitizedPaymentIntent {
  id: string
  orderId: string
  status: PaymentIntentRecord['status']
  amount: number
  currency: string
  provider: string | null
  createdAt: Date
  updatedAt: Date
}

export interface InitiatePaymentInput {
  paymentIntentId: string
  orderToken?: string
}

export interface InitiatePaymentResult {
  paymentIntent: PaymentIntentRecord
  providerOrder: ProviderOrder
}

export interface PaymentDetails {
  paymentIntent: SanitizedPaymentIntent
  events: SanitizedPaymentEvent[]
}

export interface RefundPaymentInput {
  amount: number
  reason: string
  idempotencyKey?: string
}

export interface RefundPaymentResult {
  paymentIntent: SanitizedPaymentIntent
  refund: RefundResult
}

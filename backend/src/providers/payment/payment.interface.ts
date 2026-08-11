export interface CreateOrderParams {
  amount: number
  currency: string
  orderId: string
  tenantId: string
  metadata: Record<string, string>
}

export interface ProviderOrder {
  providerOrderId: string
  providerOrderToken: string
  amount: number
  currency: string
  status: 'created' | 'attempted' | 'paid'
}

export type NormalizedEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.partially_refunded'

export interface WebhookEvent {
  providerEventId: string
  type: NormalizedEventType
  paymentId: string
  orderId: string
  amount: number
  currency: string
  status: 'paid' | 'failed' | 'refunded'
  rawPayload: object
}

export interface RefundParams {
  paymentId: string
  amount: number
  reason: string
  idempotencyKey: string
}

export interface RefundResult {
  providerRefundId: string
  status: 'pending' | 'processed' | 'failed'
  amount: number
  idempotencyKey?: string
}

export interface PaymentProviderConfig {
  credentials: Record<string, string>
  isTestMode: boolean
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<ProviderOrder>
  verifyWebhook(rawBody: string, signature: string, secret: string): void
  parseWebhook(rawPayload: object): WebhookEvent
  initiateRefund(params: RefundParams): Promise<RefundResult>
  healthCheck(): Promise<boolean>
}

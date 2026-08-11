import { createHmac, timingSafeEqual } from 'node:crypto'

import { AppError } from '../../lib/errors.js'
import type {
  CreateOrderParams,
  PaymentProvider,
  PaymentProviderConfig,
  ProviderOrder,
  RefundParams,
  RefundResult,
  WebhookEvent,
} from './payment.interface.js'

interface RazorpayOrderResponse {
  id: string
  amount: number
  currency: string
  status: 'created' | 'attempted' | 'paid'
}

interface RazorpayPaymentEntity {
  id: string
  order_id?: string
  amount: number
  currency: string
  status: string
  notes?: Record<string, string>
}

interface RazorpayRefundEntity {
  id: string
  amount: number
  status: 'pending' | 'processed' | 'failed'
}

interface RazorpayWebhookPayload {
  event?: string
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity
    }
    refund?: {
      entity?: RazorpayRefundEntity & { payment_id?: string; notes?: Record<string, string> }
    }
  }
}

export class RazorpayProvider implements PaymentProvider {
  private readonly keyId: string
  private readonly keySecret: string
  private readonly apiBaseUrl: string

  constructor(private readonly config: PaymentProviderConfig) {
    this.keyId = config.credentials.keyId ?? config.credentials.key_id ?? ''
    this.keySecret = config.credentials.keySecret ?? config.credentials.key_secret ?? ''
    this.apiBaseUrl = config.isTestMode
      ? 'https://api.razorpay.com/v1'
      : 'https://api.razorpay.com/v1'
  }

  async createOrder(params: CreateOrderParams): Promise<ProviderOrder> {
    this.assertApiCredentials()

    const response = await fetch(`${this.apiBaseUrl}/orders`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        receipt: params.orderId,
        notes: {
          orderId: params.orderId,
          tenantId: params.tenantId,
          ...params.metadata,
        },
      }),
    })

    if (!response.ok) {
      throw new AppError('Failed to create Razorpay order', 502, 'payment-provider-order-failed')
    }

    const payload = (await response.json()) as RazorpayOrderResponse
    return {
      providerOrderId: payload.id,
      providerOrderToken: payload.id,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
    }
  }

  verifyWebhook(rawBody: string, signature: string, secret: string): void {
    if (!signature || !secret) {
      throw new AppError('Invalid webhook signature', 401, 'invalid-webhook-signature')
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const left = Buffer.from(expected)
    const right = Buffer.from(signature)

    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new AppError('Invalid webhook signature', 401, 'invalid-webhook-signature')
    }
  }

  parseWebhook(rawPayload: object): WebhookEvent {
    const payload = rawPayload as RazorpayWebhookPayload
    const event = payload.event
    const payment = payload.payload?.payment?.entity
    const refund = payload.payload?.refund?.entity

    if (event === 'payment.captured' && payment) {
      return {
        providerEventId: `${event}:${payment.id}`,
        type: 'payment.captured',
        paymentId: payment.id,
        orderId: payment.notes?.orderId ?? '',
        amount: payment.amount,
        currency: payment.currency,
        status: 'paid',
        rawPayload,
      }
    }

    if (event === 'payment.failed' && payment) {
      return {
        providerEventId: `${event}:${payment.id}`,
        type: 'payment.failed',
        paymentId: payment.id,
        orderId: payment.notes?.orderId ?? '',
        amount: payment.amount,
        currency: payment.currency,
        status: 'failed',
        rawPayload,
      }
    }

    if (event === 'refund.processed' && refund) {
      return {
        providerEventId: `${event}:${refund.id}`,
        type: 'payment.refunded',
        paymentId: refund.payment_id ?? '',
        orderId: refund.notes?.orderId ?? '',
        amount: refund.amount,
        currency: 'INR',
        status: 'refunded',
        rawPayload,
      }
    }

    throw new AppError('Unsupported Razorpay webhook event', 400, 'unsupported-webhook-event')
  }

  async initiateRefund(params: RefundParams): Promise<RefundResult> {
    this.assertApiCredentials()

    const response = await fetch(`${this.apiBaseUrl}/payments/${params.paymentId}/refund`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        amount: params.amount,
        speed: 'normal',
        notes: {
          reason: params.reason,
          idempotencyKey: params.idempotencyKey,
        },
      }),
    })

    if (!response.ok) {
      throw new AppError('Failed to initiate refund with Razorpay', 502, 'payment-provider-refund-failed')
    }

    const payload = (await response.json()) as RazorpayRefundEntity
    return {
      providerRefundId: payload.id,
      status: payload.status,
      amount: payload.amount,
    }
  }

  async healthCheck(): Promise<boolean> {
    return Boolean(this.keyId && this.keySecret)
  }

  private assertApiCredentials(): void {
    if (!this.keyId || !this.keySecret) {
      throw new AppError('Payment provider credentials are incomplete', 500, 'payment-provider-config-invalid')
    }
  }

  private authHeaders(): HeadersInit {
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    return {
      authorization: `Basic ${token}`,
      'content-type': 'application/json',
    }
  }
}

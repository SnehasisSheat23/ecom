import type { CreateOrderParams, PaymentProvider, ProviderOrder, RefundParams, RefundResult, WebhookEvent } from './payment.interface.js'

export class SandboxProvider implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<ProviderOrder> {
    // Return a mock order immediately
    return {
      providerOrderId: `sandbox_order_${Date.now()}`,
      providerOrderToken: `sandbox_token_${Date.now()}`,
      amount: params.amount,
      currency: params.currency,
      status: 'created',
    }
  }

  verifyWebhook(_body: string, _signature: string, _secret: string): void {
    // Sandbox webhooks are always valid for demo
    return
  }

  parseWebhook(payload: any): WebhookEvent {
    return {
      type: 'payment.captured',
      providerEventId: `sandbox_evt_${Date.now()}`,
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      amount: payload.amount,
      currency: payload.currency,
      status: 'paid',
      rawPayload: payload,
    }
  }

  async initiateRefund(params: RefundParams): Promise<RefundResult> {
    return {
      providerRefundId: `sandbox_ref_${Date.now()}`,
      status: 'processed',
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
    }
  }

  async healthCheck(): Promise<boolean> {
    return true
  }
}

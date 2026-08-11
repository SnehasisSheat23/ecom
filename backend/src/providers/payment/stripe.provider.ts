import { AppError } from '../../lib/errors.js'
import type {
  CreateOrderParams,
  PaymentProvider,
  ProviderOrder,
  RefundParams,
  RefundResult,
  WebhookEvent,
} from './payment.interface.js'

const notImplemented = (): never => {
  throw new AppError('Stripe provider is not implemented yet', 501, 'payment-provider-not-implemented')
}

export class StripeProvider implements PaymentProvider {
  async createOrder(_params: CreateOrderParams): Promise<ProviderOrder> {
    return notImplemented()
  }

  verifyWebhook(_rawBody: string, _signature: string, _secret: string): void {
    notImplemented()
  }

  parseWebhook(_rawPayload: object): WebhookEvent {
    return notImplemented()
  }

  async initiateRefund(_params: RefundParams): Promise<RefundResult> {
    return notImplemented()
  }

  async healthCheck(): Promise<boolean> {
    return notImplemented()
  }
}

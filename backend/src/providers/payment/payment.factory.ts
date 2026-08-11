import { AppError } from '../../lib/errors.js'
import type { TenantPaymentConfig } from '../../layers/tenancy/tenancy.types.js'
import type { PaymentProvider } from './payment.interface.js'
import { RazorpayProvider } from './razorpay.provider.js'
import { StripeProvider } from './stripe.provider.js'
import { SandboxProvider } from './sandbox.provider.js'

export const createPaymentProvider = (config: TenantPaymentConfig): PaymentProvider => {
  switch (config.provider) {
    case 'razorpay':
      return new RazorpayProvider({
        credentials: config.credentials,
        isTestMode: config.is_test_mode,
      })
    case 'stripe':
      return new StripeProvider()
    case 'sandbox':
      return new SandboxProvider()
    case 'payu':
      throw new AppError('PayU provider is not implemented yet', 501, 'payment-provider-not-implemented')
    default:
      throw new AppError('Unsupported payment provider', 400, 'payment-provider-unsupported')
  }
}

import { describe, expect, it, vi } from 'vitest'

import { AppError } from '../../lib/errors.js'
import type { TenantPaymentConfig } from '../../layers/tenancy/tenancy.types.js'
import type { PaymentProvider } from '../../providers/payment/payment.interface.js'
import { PaymentsRepository } from './payments.repository.js'
import { PaymentsService } from './payments.service.js'

describe('PaymentsService', () => {
  it('requires tenant payment config for webhook handling', async () => {
    const repository = {} as PaymentsRepository
    const tenancyService = {
      getTenantPaymentConfig: vi.fn().mockResolvedValue(null),
    } as unknown as ConstructorParameters<typeof PaymentsService>[1]

    const service = new PaymentsService(repository, tenancyService)

    await expect(service.handleWebhook('tenant-1', 'razorpay', '{}', 'sig')).rejects.toMatchObject({
      code: 'tenant-payment-missing',
    } satisfies Partial<AppError>)
  })

  it('rejects provider mismatch before processing webhook', async () => {
    const repository = {} as PaymentsRepository
    const paymentConfig: TenantPaymentConfig = {
      provider: 'razorpay',
      credentials: { keyId: 'rzp_test', keySecret: 'secret' },
      webhook_secret: 'whsec',
      is_test_mode: true,
    }
    const tenancyService = {
      getTenantPaymentConfig: vi.fn().mockResolvedValue(paymentConfig),
    } as unknown as ConstructorParameters<typeof PaymentsService>[1]

    const service = new PaymentsService(repository, tenancyService, vi.fn<PaymentProviderFactory>().mockImplementation(() => {
      throw new Error('should not be called')
    }) as unknown as ConstructorParameters<typeof PaymentsService>[2])

    await expect(service.handleWebhook('tenant-1', 'stripe', '{}', 'sig')).rejects.toMatchObject({
      code: 'webhook-provider-mismatch',
    } satisfies Partial<AppError>)
  })

  it('passes the webhook header event id through the processing path', async () => {
    const repository = {
      findPaymentIntentByOrderId: vi.fn().mockResolvedValue({
        id: 'pi_1',
        tenantId: 'tenant-1',
        orderId: 'order_1',
        status: 'PENDING',
        amount: 100,
        currency: 'INR',
        provider: 'razorpay',
        providerOrderId: 'order_rzp_1',
        providerPaymentId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      insertPaymentEvent: vi.fn().mockResolvedValue({
        id: 'evt_db_1',
        tenantId: 'tenant-1',
        paymentIntentId: 'pi_1',
        provider: 'razorpay',
        providerEventId: 'header_evt_1',
        eventType: 'payment.failed',
        paymentId: 'pay_1',
        amount: 100,
        currency: 'INR',
        payload: {},
        createdAt: new Date(),
      }),
      transaction: vi.fn().mockImplementation(async (callback) =>
        callback({
          findPaymentIntentById: vi.fn().mockResolvedValue({
            id: 'pi_1',
            tenantId: 'tenant-1',
            orderId: 'order_1',
            status: 'PENDING',
            amount: 100,
            currency: 'INR',
            provider: 'razorpay',
            providerOrderId: 'order_rzp_1',
            providerPaymentId: null,
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          updatePaymentIntent: vi.fn(),
          findOrderOwnership: vi.fn().mockResolvedValue({
            customerId: 'customer-1',
            orderToken: 'token-1',
            status: 'PENDING',
          }),
          updateOrderStatus: vi.fn(),
          listPaymentEvents: vi.fn().mockResolvedValue([]),
        }),
      ),
    } as unknown as PaymentsRepository

    const paymentConfig: TenantPaymentConfig = {
      provider: 'razorpay',
      credentials: { keyId: 'rzp_test', keySecret: 'secret' },
      webhook_secret: 'whsec',
      is_test_mode: true,
    }
    const tenancyService = {
      getTenantPaymentConfig: vi.fn().mockResolvedValue(paymentConfig),
    } as unknown as ConstructorParameters<typeof PaymentsService>[1]
    const provider: PaymentProvider = {
      createOrder: vi.fn(),
      verifyWebhook: vi.fn(),
      parseWebhook: vi.fn().mockReturnValue({
        providerEventId: 'payload_evt_1',
        type: 'payment.failed',
        paymentId: 'pay_1',
        orderId: 'order_1',
        amount: 100,
        currency: 'INR',
        status: 'failed',
        rawPayload: {},
      }),
      initiateRefund: vi.fn(),
      healthCheck: vi.fn(),
    }
    const service = new PaymentsService(repository, tenancyService, vi.fn().mockReturnValue(provider))

    await service.handleWebhook('tenant-1', 'razorpay', '{}', 'sig', 'header_evt_1')

    expect((repository.insertPaymentEvent as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].providerEventId).toBe('header_evt_1')
  })
})

type PaymentProviderFactory = (config: TenantPaymentConfig) => PaymentProvider

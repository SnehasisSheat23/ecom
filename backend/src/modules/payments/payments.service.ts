import { randomUUID } from 'node:crypto'

import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import type { TenancyService } from '../../layers/tenancy/tenancy.service.js'
import type { TenantContext, TenantPaymentConfig } from '../../layers/tenancy/tenancy.types.js'
import { notificationQueue } from '../../lib/queue-names.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import { createPaymentProvider } from '../../providers/payment/payment.factory.js'
import type { PaymentProvider, ProviderOrder, RefundResult, WebhookEvent } from '../../providers/payment/payment.interface.js'
import type { JobQueueProvider } from '../../providers/queue/job-queue.interface.js'
import type { PaymentIntentRecord } from '../orders/orders.types.js'
import { PaymentsRepository } from './payments.repository.js'
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentDetails,
  RefundPaymentInput,
  RefundPaymentResult,
  SanitizedPaymentIntent,
} from './payments.types.js'

interface PaymentProviderFactory {
  (config: TenantPaymentConfig): PaymentProvider
}

export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly tenancyService: TenancyService,
    private readonly queue?: JobQueueProvider,
    private readonly events?: EventPublisher,
    private readonly providerFactory: PaymentProviderFactory = createPaymentProvider,
    private readonly marketplaceService?: any,
  ) {}

  async initiatePayment(
    tenant: TenantContext,
    input: InitiatePaymentInput,
    actor?: { customerId?: string },
  ): Promise<InitiatePaymentResult> {
    const paymentIntent = await this.requireOwnedPaymentIntent(tenant.tenantId, input, actor)

    if (paymentIntent.providerOrderId) {
      return {
        paymentIntent,
        providerOrder: {
          providerOrderId: paymentIntent.providerOrderId,
          providerOrderToken: paymentIntent.providerOrderId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status === 'SUCCEEDED' ? 'paid' : 'created',
        },
      }
    }

    const paymentConfig = await this.requirePaymentConfig(tenant.tenantId)
    const provider = this.providerFactory(paymentConfig)
    const providerOrder = await provider.createOrder({
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      orderId: paymentIntent.orderId,
      tenantId: tenant.tenantId,
      metadata: {
        paymentIntentId: paymentIntent.id,
      },
    })

    const updatedIntent = await this.repository.updatePaymentIntent(tenant.tenantId, paymentIntent.id, {
      status: 'REQUIRES_ACTION',
      provider: paymentConfig.provider,
      providerOrderId: providerOrder.providerOrderId,
      metadata: {
        ...paymentIntent.metadata,
        providerOrderToken: providerOrder.providerOrderToken,
      },
    })

    logger.info(
      {
        tenantId: tenant.tenantId,
        orderId: updatedIntent.orderId,
        paymentIntentId: updatedIntent.id,
        provider: paymentConfig.provider,
        providerOrderId: providerOrder.providerOrderId,
      },
      'payment initiated',
    )

    return {
      paymentIntent: updatedIntent,
      providerOrder,
    }
  }

  async handleWebhook(
    tenantId: string,
    providerName: TenantPaymentConfig['provider'],
    rawBody: string,
    signature: string,
    webhookEventId?: string,
  ): Promise<void> {
    const paymentConfig = await this.tenancyService.getTenantPaymentConfig(tenantId)
    if (!paymentConfig) {
      throw new AppError('Payment config is missing', 409, 'tenant-payment-missing')
    }
    if (paymentConfig.provider !== providerName) {
      throw new AppError('Webhook provider does not match tenant configuration', 401, 'webhook-provider-mismatch')
    }
    if (!paymentConfig.webhook_secret) {
      throw new AppError('Tenant webhook secret is missing', 409, 'tenant-webhook-secret-missing')
    }

    const provider = this.providerFactory(paymentConfig)
    provider.verifyWebhook(rawBody, signature, paymentConfig.webhook_secret)

    const parsedPayload = JSON.parse(rawBody) as object
    const event = provider.parseWebhook(parsedPayload)
    await this.processWebhookEvent(tenantId, paymentConfig.provider, event, webhookEventId)
  }

  async initiateRefund(
    tenantId: string,
    paymentIntentId: string,
    input: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    const paymentIntent = await this.repository.findPaymentIntentById(tenantId, paymentIntentId)
    if (!paymentIntent) {
      throw new AppError('Payment intent not found', 404, 'payment-intent-not-found')
    }

    if (!paymentIntent.providerPaymentId) {
      throw new AppError('Payment has no provider payment id yet', 409, 'payment-refund-unavailable')
    }

    if (input.amount > paymentIntent.amount) {
      throw new AppError('Refund amount exceeds payment amount', 400, 'refund-amount-invalid')
    }
    if (paymentIntent.status !== 'SUCCEEDED') {
      throw new AppError('Only successful payments can be refunded', 409, 'payment-refund-invalid-status')
    }

    const existingEvents = await this.repository.listPaymentEvents(tenantId, paymentIntent.orderId)
    const refundedAmount = existingEvents
      .filter((event) => event.eventType === 'payment.refunded' || event.eventType === 'payment.partially_refunded')
      .reduce((sum, event) => sum + (event.amount ?? 0), 0)

    if (refundedAmount >= paymentIntent.amount) {
      throw new AppError('Payment is already fully refunded', 409, 'payment-already-refunded')
    }
    if (input.amount > paymentIntent.amount - refundedAmount) {
      throw new AppError('Refund amount exceeds remaining refundable balance', 400, 'refund-amount-invalid')
    }

    const paymentConfig = await this.requirePaymentConfig(tenantId)
    const provider = this.providerFactory(paymentConfig)
    const refundIdempotencyKey = input.idempotencyKey ?? `${tenantId}:${paymentIntentId}:${input.amount}:${input.reason}`
    const refund = await provider.initiateRefund({
      paymentId: paymentIntent.providerPaymentId,
      amount: input.amount,
      reason: input.reason,
      idempotencyKey: refundIdempotencyKey,
    })

    logger.info(
      {
        tenantId,
        paymentIntentId,
        provider: paymentConfig.provider,
        providerPaymentId: paymentIntent.providerPaymentId,
        refundId: refund.providerRefundId,
      },
      'payment refund initiated',
    )

    return {
      paymentIntent: this.sanitizePaymentIntent(paymentIntent),
      refund,
    }
  }

  async getPaymentDetails(tenantId: string, orderId: string): Promise<PaymentDetails> {
    const details = await this.repository.getPaymentDetails(tenantId, orderId)
    if (!details) {
      throw new AppError('Payment details not found', 404, 'payment-details-not-found')
    }
    return details
  }

  private async processWebhookEvent(
    tenantId: string,
    providerName: string,
    event: WebhookEvent,
    webhookEventId?: string,
  ): Promise<void> {
    if (!event.orderId) {
      throw new AppError('Webhook payload missing internal order id', 400, 'webhook-order-id-missing')
    }

    const paymentIntent = await this.repository.findPaymentIntentByOrderId(tenantId, event.orderId)
    if (!paymentIntent) {
      throw new AppError('Payment intent not found for order', 404, 'payment-intent-not-found')
    }

    const dedupeEventId = webhookEventId?.trim() || event.providerEventId
    if (!dedupeEventId) {
      throw new AppError('Webhook event id is missing', 400, 'webhook-event-id-missing')
    }

    const insertedEvent = await this.repository.insertPaymentEvent({
      tenantId,
      paymentIntentId: paymentIntent.id,
      provider: providerName,
      providerEventId: dedupeEventId,
      eventType: event.type,
      paymentId: event.paymentId,
      amount: event.amount,
      currency: event.currency,
      payload: event.rawPayload as Record<string, unknown>,
    })

    if (!insertedEvent) {
      logger.info(
        {
          tenantId,
          paymentIntentId: paymentIntent.id,
          provider: providerName,
          providerEventId: dedupeEventId,
        },
        'duplicate payment webhook ignored',
      )
      return
    }

    await this.repository.transaction(async (repository) => {
      const latestPaymentIntent = await repository.findPaymentIntentById(tenantId, paymentIntent.id)
      if (!latestPaymentIntent) {
        throw new AppError('Payment intent not found', 404, 'payment-intent-not-found')
      }

      switch (event.type) {
        case 'payment.captured':
          if (latestPaymentIntent.status === 'SUCCEEDED') {
            return
          }
          if (latestPaymentIntent.status === 'CANCELLED') {
            logger.warn(
              {
                tenantId,
                orderId: paymentIntent.orderId,
                paymentIntentId: paymentIntent.id,
                providerEventId: dedupeEventId,
              },
              'ignored captured webhook for cancelled payment intent',
            )
            return
          }
          await repository.updatePaymentIntent(tenantId, paymentIntent.id, {
            status: 'SUCCEEDED',
            providerPaymentId: event.paymentId,
          })

          const orderOwnership = await repository.findOrderOwnership(tenantId, paymentIntent.orderId)
          if (orderOwnership && orderOwnership.status !== 'CANCELLED') {
            await repository.updateOrderStatus(tenantId, paymentIntent.orderId, 'CONFIRMED')
            
            // Increment summary stats (Soft-fail: log error but don't block order confirmation)
            try {
              await this.tenancyService.incrementStats(tenantId, {
                totalRevenue: paymentIntent.amount,
                totalOrders: 1,
              })
            } catch (err) {
              logger.error({ err, tenantId }, 'Failed to increment tenant revenue/order stats')
            }
          }

          await this.publishPaymentEvent('payment.captured', tenantId, paymentIntent, insertedEvent.providerEventId)

          if (this.marketplaceService) {
            await (this.marketplaceService as any).handlePaymentCaptured?.(
              paymentIntent.orderId,
              tenantId,
              insertedEvent.providerEventId,
              repository.getDb()
            )
          }
          break
        case 'payment.failed':
          if (latestPaymentIntent.status === 'SUCCEEDED' || latestPaymentIntent.status === 'CANCELLED') {
            logger.warn(
              {
                tenantId,
                orderId: paymentIntent.orderId,
                paymentIntentId: paymentIntent.id,
                providerEventId: dedupeEventId,
              },
              'ignored failed webhook after terminal payment state',
            )
            return
          }
          await repository.updatePaymentIntent(tenantId, paymentIntent.id, {
            status: 'FAILED',
            providerPaymentId: event.paymentId,
          })
          await this.publishPaymentEvent('payment.failed', tenantId, paymentIntent, insertedEvent.providerEventId)
          break
        case 'payment.refunded':
        case 'payment.partially_refunded':
          if (!latestPaymentIntent.providerPaymentId && event.paymentId) {
            await repository.updatePaymentIntent(tenantId, paymentIntent.id, {
              providerPaymentId: event.paymentId,
            })
          }

          const existingEvents = await repository.listPaymentEvents(tenantId, paymentIntent.orderId)
          const refundedAmount = existingEvents
            .filter((row) => row.id !== insertedEvent.id)
            .filter((row) => row.eventType === 'payment.refunded' || row.eventType === 'payment.partially_refunded')
            .reduce((sum, row) => sum + (row.amount ?? 0), 0)
          const totalRefunded = refundedAmount + (event.amount ?? 0)
          const nextStatus = totalRefunded >= paymentIntent.amount ? 'CANCELLED' : 'SUCCEEDED'

          await repository.updatePaymentIntent(tenantId, paymentIntent.id, {
            status: nextStatus,
            providerPaymentId: event.paymentId,
          })
          if (totalRefunded >= paymentIntent.amount) {
            await repository.updateOrderStatus(tenantId, paymentIntent.orderId, 'CANCELLED')
          }
          await this.publishPaymentEvent(event.type, tenantId, paymentIntent, insertedEvent.providerEventId)
          await (this.marketplaceService as any)?.handlePaymentRefunded?.(
            paymentIntent.orderId,
            tenantId,
            insertedEvent.providerEventId,
            event.amount,
            paymentIntent.amount,
          )
          break
      }
    })
  }

  private async publishPaymentEvent(
    eventName: 'payment.captured' | 'payment.failed' | 'payment.refunded' | 'payment.partially_refunded',
    tenantId: string,
    paymentIntent: PaymentIntentRecord,
    providerEventId: string,
  ): Promise<void> {
    await this.events?.publish(eventName, {
      tenantId,
      orderId: paymentIntent.orderId,
      paymentIntentId: paymentIntent.id,
      providerEventId,
    })

    if (!this.queue) {
      return
    }

    try {
      await this.queue.publish(
        {
          queueName: notificationQueue(tenantId),
          jobName: eventName,
          jobId: `payment:${providerEventId}`,
          payload: {
            tenantId,
            orderId: paymentIntent.orderId,
            paymentIntentId: paymentIntent.id,
            eventName,
          },
        },
        {
          url: 'https://example.invalid/internal/jobs/payments/notify',
        },
      )
    } catch (error) {
      logger.error(
        {
          tenantId,
          orderId: paymentIntent.orderId,
          paymentIntentId: paymentIntent.id,
          providerEventId,
          eventName,
          err: error,
        },
        'payment follow-up job publish failed',
      )
    }
  }

  private async requireOwnedPaymentIntent(
    tenantId: string,
    input: InitiatePaymentInput,
    actor?: { customerId?: string },
  ): Promise<PaymentIntentRecord> {
    const paymentIntent = await this.repository.findPaymentIntentById(tenantId, input.paymentIntentId)
    if (!paymentIntent) {
      throw new AppError('Payment intent not found', 404, 'payment-intent-not-found')
    }

    const ownership = await this.repository.findOrderOwnership(tenantId, paymentIntent.orderId)
    if (!ownership) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }

    const isCustomerOwner = Boolean(actor?.customerId && ownership.customerId === actor.customerId)
    const isGuestOwner = Boolean(input.orderToken && ownership.orderToken === input.orderToken)

    if (!isCustomerOwner && !isGuestOwner) {
      throw new AppError('Order access denied for payment initiation', 403, 'payment-initiation-forbidden')
    }

    if (ownership.status !== 'PENDING') {
      throw new AppError('Order is no longer payable', 409, 'payment-order-not-payable')
    }

    return paymentIntent
  }

  private async requirePaymentConfig(tenantId: string): Promise<TenantPaymentConfig> {
    const paymentConfig = await this.tenancyService.getTenantPaymentConfig(tenantId)
    if (!paymentConfig) {
      // Fallback to sandbox for demo purposes if no config exists
      return {
        provider: 'sandbox',
        credentials: {},
        is_test_mode: true
      } as any
    }

    // Fallback to sandbox in development if dummy credentials are set
    const credentials = paymentConfig.credentials || {}
    const keyId = credentials.keyId ?? credentials.key_id ?? ''
    if (paymentConfig.provider === 'razorpay' && keyId === 'rzp_test') {
      return {
        provider: 'sandbox',
        credentials: {},
        is_test_mode: true
      } as any
    }

    return paymentConfig
  }

  private sanitizePaymentIntent(paymentIntent: PaymentIntentRecord): SanitizedPaymentIntent {
    return {
      id: paymentIntent.id,
      orderId: paymentIntent.orderId,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      provider: paymentIntent.provider,
      createdAt: paymentIntent.createdAt,
      updatedAt: paymentIntent.updatedAt,
    }
  }

  async handleSandboxCapture(tenantId: string, paymentIntentId: string, sandboxEventId: string): Promise<void> {
    const paymentIntent = await this.repository.findPaymentIntentById(tenantId, paymentIntentId)
    if (!paymentIntent) {
      throw new AppError('Payment intent not found', 404, 'payment-intent-not-found')
    }

    if (paymentIntent.status === 'SUCCEEDED') {
      return // Already captured
    }

    const insertedEvent = await this.repository.insertPaymentEvent({
      tenantId,
      paymentIntentId: paymentIntent.id,
      provider: 'sandbox',
      providerEventId: sandboxEventId,
      eventType: 'payment.captured',
      paymentId: `sandbox_pay_${sandboxEventId}`,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      payload: { sandbox: true, capturedAt: new Date().toISOString() },
    })

    if (!insertedEvent) {
      logger.info({ tenantId, paymentIntentId, sandboxEventId }, 'duplicate sandbox capture ignored')
      return
    }

    await this.repository.transaction(async (repository) => {
      const latestPaymentIntent = await repository.findPaymentIntentByIdWithLock(tenantId, paymentIntent.id)
      if (!latestPaymentIntent) {
        throw new AppError('Payment intent not found', 404, 'payment-intent-not-found')
      }

      await repository.updatePaymentIntent(tenantId, paymentIntent.id, {
        status: 'SUCCEEDED',
        provider: 'sandbox',
        providerPaymentId: `sandbox_pay_${sandboxEventId}`,
      })

      // Force status to CONFIRMED if it's currently PENDING
      // This ensures we don't get stuck if the status was slightly different
      const orderOwnership = await repository.findOrderOwnership(tenantId, paymentIntent.orderId)
      if (orderOwnership && orderOwnership.status !== 'CANCELLED') {
        await repository.updateOrderStatus(tenantId, paymentIntent.orderId, 'CONFIRMED')
      }

      // Run vendor sub-order updates INSIDE the same transaction for safety
      if (this.marketplaceService) {
        await (this.marketplaceService as any).handlePaymentCaptured?.(
          paymentIntent.orderId,
          tenantId,
          sandboxEventId,
          repository.getDb() // Pass the transaction DB
        )
      }
    })

    await this.events?.publish('payment.captured', {
      tenantId,
      orderId: paymentIntent.orderId,
      paymentIntentId: paymentIntent.id,
      providerEventId: sandboxEventId,
    })
  }
}


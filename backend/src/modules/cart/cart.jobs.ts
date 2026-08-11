import { cartAbandonmentQueue } from '../../lib/queue-names.js'
import type { JobQueueProvider, QueuePublishTarget } from '../../providers/queue/job-queue.interface.js'

export const CART_EXPIRY_JOB_NAME = 'cart.expiry'
export const CART_EXPIRY_DELAY_MS = 7 * 24 * 60 * 60 * 1000

export interface CartExpiryJobPayload {
  tenantId: string
  cartId: string
}

export interface CartExpiryJobRequest {
  queueName: string
  jobName: string
  jobId: string
  payload: CartExpiryJobPayload
  delayMs: number
}

export interface CartExpiryJobScheduler {
  upsertExpiryJob(job: CartExpiryJobRequest): Promise<void>
  removeExpiryJob(job: CartExpiryJobRequest): Promise<void>
}

export const createCartExpiryScheduler = (
  queue: JobQueueProvider,
  target: QueuePublishTarget,
): CartExpiryJobScheduler => ({
  async upsertExpiryJob(job) {
    await queue.publish(job, target)
  },
  async removeExpiryJob(job) {
    await queue.cancel(job)
  },
})

export const createCartExpiryJob = (
  payload: CartExpiryJobPayload,
  delayMs = CART_EXPIRY_DELAY_MS,
): CartExpiryJobRequest => ({
  queueName: cartAbandonmentQueue(payload.tenantId),
  jobName: CART_EXPIRY_JOB_NAME,
  jobId: `cart-expiry:${payload.tenantId}:${payload.cartId}`,
  payload,
  delayMs,
})

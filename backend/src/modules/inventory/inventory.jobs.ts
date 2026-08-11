import { inventoryReleaseQueue } from '../../lib/queue-names.js'
import type { JobQueueProvider, QueuePublishTarget } from '../../providers/queue/job-queue.interface.js'

export const INVENTORY_RELEASE_JOB_NAME = 'inventory.release'
export const INVENTORY_RELEASE_DELAY_MS = 15 * 60 * 1000

export interface InventoryReleaseJobPayload {
  tenantId: string
  variantId: string
  quantity: number
  cartId: string
}

export interface InventoryReleaseJobRequest {
  queueName: string
  jobName: string
  jobId: string
  payload: InventoryReleaseJobPayload
  delayMs: number
}

export interface InventoryReleaseJobScheduler {
  upsertReleaseJob(job: InventoryReleaseJobRequest): Promise<void>
  removeReleaseJob(job: InventoryReleaseJobRequest): Promise<void>
}

export const createInventoryReleaseScheduler = (
  queue: JobQueueProvider,
  target: QueuePublishTarget,
): InventoryReleaseJobScheduler => ({
  async upsertReleaseJob(job) {
    await queue.publish(job, target)
  },
  async removeReleaseJob(job) {
    await queue.cancel(job)
  },
})

export const createInventoryReleaseJob = (
  payload: InventoryReleaseJobPayload,
  delayMs = INVENTORY_RELEASE_DELAY_MS,
): InventoryReleaseJobRequest => ({
  queueName: inventoryReleaseQueue(payload.tenantId),
  jobName: INVENTORY_RELEASE_JOB_NAME,
  jobId: `inventory-release:${payload.tenantId}:${payload.cartId}:${payload.variantId}`,
  payload,
  delayMs,
})

import { logger } from '../../lib/logger.js'
import type { JobQueueProvider, QueueJob, QueuePublishTarget } from './job-queue.interface.js'

interface QStashPublishResponse {
  messageId?: string
  error?: string
}

export class QStashJobQueueProvider implements JobQueueProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async publish(job: QueueJob, target: QueuePublishTarget): Promise<void> {
    const headers = new Headers({
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Upstash-Method': 'POST',
      'Upstash-Forward-Job-Id': job.jobId,
      'Upstash-Delay': this.toDelayHeader(job.delayMs),
      'Upstash-Retries': '3',
      'Upstash-Deduplication-Id': job.jobId,
      'X-Queue-Name': job.queueName,
      'X-Job-Name': job.jobName,
      ...target.headers,
    })

    const response = await fetch(`${this.baseUrl}/v2/publish/${encodeURIComponent(target.url)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(job.payload),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`QStash publish failed (${response.status}): ${body}`)
    }

    const result = (await response.json()) as QStashPublishResponse
    logger.info(
      {
        queueName: job.queueName,
        jobName: job.jobName,
        jobId: job.jobId,
        qstashMessageId: result.messageId ?? null,
      },
      'job published to qstash',
    )
  }

  async cancel(job: Pick<QueueJob, 'jobId'>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v2/messages/${encodeURIComponent(job.jobId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (response.status === 404) {
      logger.info({ jobId: job.jobId }, 'qstash message already absent during cancel')
      return
    }

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`QStash cancel failed (${response.status}): ${body}`)
    }
  }

  private toDelayHeader(delayMs?: number): string {
    if (!delayMs || delayMs <= 0) {
      return '0s'
    }

    const seconds = Math.ceil(delayMs / 1000)
    return `${seconds}s`
  }
}

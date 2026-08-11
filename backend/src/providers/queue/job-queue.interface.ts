export interface QueueJob {
  queueName: string
  jobName: string
  jobId: string
  payload: object
  delayMs?: number
}

export interface QueuePublishTarget {
  url: string
  headers?: Record<string, string>
}

export interface JobQueueProvider {
  publish(job: QueueJob, target: QueuePublishTarget): Promise<void>
  cancel(job: Pick<QueueJob, 'jobId'>): Promise<void>
}

import type { JobQueueProvider, QueueJob, QueuePublishTarget } from './job-queue.interface.js'

export class NoopJobQueueProvider implements JobQueueProvider {
  async publish(_job: QueueJob, _target: QueuePublishTarget): Promise<void> {}

  async cancel(_job: Pick<QueueJob, 'jobId'>): Promise<void> {}
}

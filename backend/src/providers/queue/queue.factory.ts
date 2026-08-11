import { getOptionalEnv, requireEnv } from '../../lib/env.js'
import type { JobQueueProvider } from './job-queue.interface.js'
import { NoopJobQueueProvider } from './noop-job-queue.provider.js'
import { QStashJobQueueProvider } from './qstash.provider.js'

export type JobQueueProviderName = 'qstash' | 'noop'

let queueProviderSingleton: JobQueueProvider | undefined

const resolveQueueProviderName = (): JobQueueProviderName =>
  (getOptionalEnv('JOB_QUEUE_PROVIDER') as JobQueueProviderName | undefined) ?? 'qstash'

export const createJobQueueProviderFromEnv = (): JobQueueProvider => {
  const provider = resolveQueueProviderName()

  if (provider === 'noop') {
    return new NoopJobQueueProvider()
  }

  return new QStashJobQueueProvider(requireEnv('QSTASH_BASE_URL'), requireEnv('QSTASH_TOKEN'))
}

export const getJobQueueProvider = (): JobQueueProvider => {
  queueProviderSingleton ??= createJobQueueProviderFromEnv()
  return queueProviderSingleton
}

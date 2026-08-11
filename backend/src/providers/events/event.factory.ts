import { getOptionalEnv } from '../../lib/env.js'
import type { EventPublisher } from './event-bus.interface.js'
import { InMemoryEventBus } from './event-bus.js'
import { NoopEventPublisher } from './noop-event.publisher.js'

export type EventProviderName = 'in-memory' | 'noop' | 'bullmq' | 'redis'

let eventPublisherSingleton: EventPublisher | undefined

const resolveEventProviderName = (): EventProviderName =>
  (getOptionalEnv('EVENT_PROVIDER') as EventProviderName | undefined) ?? 'in-memory'

export const createEventPublisherFromEnv = (): EventPublisher => {
  const provider = resolveEventProviderName()

  if (provider === 'noop') {
    return new NoopEventPublisher()
  }

  // Currently defaults to in-memory event bus with BullMQ / PubSub interface.
  // Future BullMQ or Redis implementations can be added seamlessly here.
  return new InMemoryEventBus()
}

export const getEventPublisher = (): EventPublisher => {
  eventPublisherSingleton ??= createEventPublisherFromEnv()
  return eventPublisherSingleton
}

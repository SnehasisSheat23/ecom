import type { EventHandler, EventPublisher } from './event-bus.interface.js'

export class NoopEventPublisher implements EventPublisher {
  async publish(): Promise<void> {
    return undefined
  }

  subscribe<TPayload extends Record<string, unknown>>(
    _event: string,
    _handler: EventHandler<TPayload>,
  ): () => void {
    return () => {}
  }
}

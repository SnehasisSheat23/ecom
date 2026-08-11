import type { EventHandler, EventPublisher } from './event-bus.interface.js'

export class InMemoryEventBus implements EventPublisher {
  private handlers = new Map<string, Set<EventHandler>>()

  subscribe<TPayload extends Record<string, unknown>>(
    event: string,
    handler: EventHandler<TPayload>,
  ): () => void {
    const current = this.handlers.get(event) ?? new Set()
    current.add(handler)
    this.handlers.set(event, current)

    return () => {
      const set = this.handlers.get(event)
      if (set) {
        set.delete(handler)
        if (set.size === 0) {
          this.handlers.delete(event)
        }
      }
    }
  }

  async publish<TPayload extends Record<string, unknown>>(event: string, payload: TPayload): Promise<void> {
    const handlers = this.handlers.get(event)
    if (!handlers || handlers.size === 0) return

    for (const handler of handlers) {
      try {
        await handler(payload)
      } catch (err) {
        // Log error but don't crash other handlers
        console.error(`Error in event handler for "${event}":`, err)
      }
    }
  }
}


export type EventHandler<TPayload = any> = (payload: TPayload) => Promise<void> | void

export interface EventPublisher {
  publish<TPayload extends Record<string, unknown>>(event: string, payload: TPayload): Promise<void>
  subscribe<TPayload extends Record<string, unknown>>(event: string, handler: EventHandler<TPayload>): () => void
}

export type EventBus = EventPublisher


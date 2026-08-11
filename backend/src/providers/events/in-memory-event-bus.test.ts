import { describe, expect, it, vi } from 'vitest'
import { InMemoryEventBus } from './event-bus.js'

describe('InMemoryEventBus', () => {
  it('publishes and subscribes to events', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()

    const unsubscribe = bus.subscribe('order.created', handler)
    await bus.publish('order.created', { orderId: '123' })

    expect(handler).toHaveBeenCalledWith({ orderId: '123' })

    unsubscribe()
    await bus.publish('order.created', { orderId: '456' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('isolates errors in event handlers so one failing handler does not block others', async () => {
    const bus = new InMemoryEventBus()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'))
    const successfulHandler = vi.fn()

    bus.subscribe('order.created', failingHandler)
    bus.subscribe('order.created', successfulHandler)

    await bus.publish('order.created', { orderId: '789' })

    expect(failingHandler).toHaveBeenCalledWith({ orderId: '789' })
    expect(successfulHandler).toHaveBeenCalledWith({ orderId: '789' })
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})

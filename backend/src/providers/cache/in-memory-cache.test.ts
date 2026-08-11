import { describe, expect, it, vi } from 'vitest'
import { InMemoryCacheProvider } from './in-memory-cache.provider.js'

describe('InMemoryCacheProvider', () => {
  it('sets and gets cached values', async () => {
    const cache = new InMemoryCacheProvider()
    await cache.set('key1', { foo: 'bar' })

    const result = await cache.get<{ foo: string }>('key1')
    expect(result).toEqual({ foo: 'bar' })
  })

  it('returns null for non-existent keys', async () => {
    const cache = new InMemoryCacheProvider()
    const result = await cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('deletes specific keys', async () => {
    const cache = new InMemoryCacheProvider()
    await cache.set('key1', 'val1')
    await cache.delete('key1')

    expect(await cache.get('key1')).toBeNull()
  })

  it('deletes keys by prefix', async () => {
    const cache = new InMemoryCacheProvider()
    await cache.set('tenant1:user1', 'a')
    await cache.set('tenant1:user2', 'b')
    await cache.set('tenant2:user1', 'c')

    await cache.deleteByPrefix('tenant1:')

    expect(await cache.get('tenant1:user1')).toBeNull()
    expect(await cache.get('tenant1:user2')).toBeNull()
    expect(await cache.get('tenant2:user1')).toBe('c')
  })

  it('respects TTL expiration', async () => {
    vi.useFakeTimers()
    const cache = new InMemoryCacheProvider()

    await cache.set('expiring', 'value', 2) // 2 seconds TTL

    expect(await cache.get('expiring')).toBe('value')

    // Advance time by 3 seconds
    vi.advanceTimersByTime(3000)

    expect(await cache.get('expiring')).toBeNull()
    vi.useRealTimers()
  })

  it('checks key existence and clears cache', async () => {
    const cache = new InMemoryCacheProvider()
    await cache.set('key1', 'val1')

    expect(await cache.exists('key1')).toBe(true)
    expect(await cache.exists('key2')).toBe(false)

    await cache.clear()
    expect(await cache.exists('key1')).toBe(false)
  })
})

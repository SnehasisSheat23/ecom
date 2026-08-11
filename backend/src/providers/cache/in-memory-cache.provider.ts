import type { CacheProvider } from './cache.interface.js'

interface CacheEntry {
  value: unknown
  expiresAt?: number
}

export class InMemoryCacheProvider implements CacheProvider {
  private readonly store = new Map<string, CacheEntry>()

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = typeof ttlSeconds === 'number' && ttlSeconds > 0
      ? Date.now() + ttlSeconds * 1000
      : undefined

    this.store.set(key, { value, expiresAt })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}


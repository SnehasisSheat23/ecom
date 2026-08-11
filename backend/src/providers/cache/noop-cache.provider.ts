import type { CacheProvider } from './cache.interface.js'

export class NoopCacheProvider implements CacheProvider {
  async get<T>(_key: string): Promise<T | null> {
    return null
  }

  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {}

  async delete(_key: string): Promise<void> {}

  async deleteByPrefix(_prefix: string): Promise<void> {}
}

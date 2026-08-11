import { getOptionalEnv, requireEnv } from '../../lib/env.js'
import type { CacheProvider } from './cache.interface.js'
import { InMemoryCacheProvider } from './in-memory-cache.provider.js'
import { NoopCacheProvider } from './noop-cache.provider.js'
import { UpstashRedisCacheProvider } from './upstash-redis.provider.js'

export type CacheProviderName = 'in-memory' | 'upstash-redis' | 'noop'

let cacheProviderSingleton: CacheProvider | undefined

const resolveCacheProviderName = (): CacheProviderName =>
  (getOptionalEnv('CACHE_PROVIDER') as CacheProviderName | undefined) ?? 'in-memory'

export const createCacheProviderFromEnv = (): CacheProvider => {
  const provider = resolveCacheProviderName()

  if (provider === 'noop') {
    return new NoopCacheProvider()
  }

  if (provider === 'in-memory') {
    return new InMemoryCacheProvider()
  }

  const url = getOptionalEnv('UPSTASH_REDIS_REST_URL')
  const token = getOptionalEnv('UPSTASH_REDIS_REST_TOKEN')

  if (!url || !token) {
    console.warn('[CacheFactory] Upstash Redis credentials not configured. Falling back to InMemoryCacheProvider.')
    return new InMemoryCacheProvider()
  }

  return new UpstashRedisCacheProvider(url, token)
}


export const getCacheProvider = (): CacheProvider => {
  cacheProviderSingleton ??= createCacheProviderFromEnv()
  return cacheProviderSingleton
}

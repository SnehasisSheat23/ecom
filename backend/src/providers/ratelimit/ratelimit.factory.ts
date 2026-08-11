import { getOptionalEnv } from '../../lib/env.js'
import { getCacheProvider } from '../cache/cache.factory.js'
import { CacheRateLimitProvider } from './cache-ratelimit.provider.js'
import type { RateLimitProvider } from './ratelimit.interface.js'

export type RateLimitProviderName = 'cache' | 'upstash'

let rateLimitProviderSingleton: RateLimitProvider | undefined

const resolveProviderName = (): RateLimitProviderName =>
  (getOptionalEnv('RATE_LIMIT_PROVIDER') as RateLimitProviderName | undefined) ?? 'cache'

export const createRateLimitProviderFromEnv = (): RateLimitProvider => {
  const provider = resolveProviderName()

  // Both 'cache' and 'upstash' currently use the CacheRateLimitProvider.
  // When @upstash/ratelimit is integrated, add a dedicated UpstashRateLimitProvider
  // class that implements RateLimitProvider and wire it here for the 'upstash' case.
  if (provider === 'upstash') {
    return new CacheRateLimitProvider(getCacheProvider())
  }

  return new CacheRateLimitProvider(getCacheProvider())
}

export const getRateLimitProvider = (): RateLimitProvider => {
  rateLimitProviderSingleton ??= createRateLimitProviderFromEnv()
  return rateLimitProviderSingleton
}

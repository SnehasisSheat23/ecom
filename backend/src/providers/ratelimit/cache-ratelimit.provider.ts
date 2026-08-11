import type { CacheProvider } from '../cache/cache.interface.js'
import type { RateLimitProvider, RateLimitResult } from './ratelimit.interface.js'

interface Bucket {
  count: number
  resetsAt: number
}

/**
 * Rate limiter backed by a CacheProvider (Upstash Redis, etc.).
 * Uses a sliding-window counter stored as a JSON object.
 *
 * This is the default implementation and works with any CacheProvider,
 * including UpstashRedisCacheProvider for serverless deployments.
 */
export class CacheRateLimitProvider implements RateLimitProvider {
  constructor(private readonly cache: CacheProvider) {}

  async limit(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now()
    const bucket = await this.cache.get<Bucket>(identifier)

    if (!bucket || bucket.resetsAt <= now) {
      await this.cache.set<Bucket>(
        identifier,
        { count: 1, resetsAt: now + windowMs },
        Math.ceil(windowMs / 1000),
      )
      return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowMs }
    }

    if (bucket.count >= limit) {
      return { allowed: false, limit, remaining: 0, resetAt: bucket.resetsAt }
    }

    bucket.count += 1
    const ttlSeconds = Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000))
    await this.cache.set<Bucket>(identifier, bucket, ttlSeconds)
    return { allowed: true, limit, remaining: limit - bucket.count, resetAt: bucket.resetsAt }
  }
}

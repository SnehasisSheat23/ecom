import type { MiddlewareHandler } from 'hono'

import { rateLimitKey } from '../lib/redis-keys.js'
import { AppError } from '../lib/errors.js'
import type { AppBindings } from '../lib/http.js'
import { getRateLimitProvider } from '../providers/ratelimit/ratelimit.factory.js'
import type { RateLimitProvider } from '../providers/ratelimit/ratelimit.interface.js'

export const createRateLimitMiddleware = (
  options: { limit: number; windowMs: number },
  provider?: RateLimitProvider,
): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const resolvedProvider = provider ?? getRateLimitProvider()
    const tenantId = c.get('tenant').tenantId
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown'
    const key = rateLimitKey(tenantId, ip, new URL(c.req.url).pathname)

    const result = await resolvedProvider.limit(key, options.limit, options.windowMs)

    c.header('X-RateLimit-Limit', String(result.limit))
    c.header('X-RateLimit-Remaining', String(result.remaining))
    c.header('X-RateLimit-Reset', String(result.resetAt))

    if (!result.allowed) {
      throw new AppError('Rate limit exceeded', 429, 'rate-limit-exceeded')
    }

    await next()
  }
}

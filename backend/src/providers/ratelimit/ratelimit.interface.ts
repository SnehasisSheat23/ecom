/**
 * Provider-agnostic rate limiting interface.
 *
 * Implementations:
 * - UpstashRateLimitProvider (serverless, HTTP-based)
 * - CacheRateLimitProvider  (fallback using CacheProvider)
 *
 * Follows the same provider pattern used by CacheProvider, EventPublisher,
 * PaymentProvider, and JobQueueProvider.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Maximum requests allowed in the window */
  limit: number
  /** Remaining requests in the window */
  remaining: number
  /** Unix timestamp (ms) when the window resets */
  resetAt: number
}

export interface RateLimitProvider {
  /**
   * Check and consume one unit from the rate limit bucket.
   * @param identifier - Unique key (e.g., tenant:ip:endpoint)
   * @param limit - Max requests per window
   * @param windowMs - Window duration in milliseconds
   */
  limit(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult>
}

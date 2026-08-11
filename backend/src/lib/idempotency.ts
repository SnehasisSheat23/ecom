import type { CacheProvider } from '../providers/cache/cache.interface.js'

export const paymentWebhookIdempotencyKey = (tenantId: string, provider: string, eventId: string) =>
  `tenant:${tenantId}:payments:${provider}:webhook:${eventId}`

export class IdempotencyStore {
  constructor(private readonly cache?: CacheProvider) {}

  async remember(key: string, ttlSeconds = 60 * 60): Promise<boolean> {
    if (!this.cache) {
      return true
    }

    const existing = await this.cache.get<boolean>(key)
    if (existing) {
      return false
    }

    await this.cache.set(key, true, ttlSeconds)
    return true
  }
}

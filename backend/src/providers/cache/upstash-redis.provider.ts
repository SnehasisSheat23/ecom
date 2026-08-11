import type { CacheProvider } from './cache.interface.js'

interface UpstashRedisValueResponse<T> {
  result: T | null
}

interface UpstashRedisScanResponse {
  result: [string, string[]]
}

export class UpstashRedisCacheProvider implements CacheProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const response = await this.request<UpstashRedisValueResponse<string>>(['GET', key])
    const value = response.result
    return value === null ? null : (JSON.parse(value) as T)
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const args = ['SET', key, JSON.stringify(value)]
    if (typeof ttlSeconds === 'number') {
      args.push('EX', String(ttlSeconds))
    }

    await this.request(args)
  }

  async delete(key: string): Promise<void> {
    await this.request(['DEL', key])
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    let cursor = '0'

    do {
      const response = await this.request<UpstashRedisScanResponse>([
        'SCAN',
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        '100',
      ])
      cursor = response.result[0]
      const keys = response.result[1]

      if (keys.length > 0) {
        await this.request(['DEL', ...keys])
      }
    } while (cursor !== '0')
  }

  private async request<T = unknown>(command: string[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Upstash Redis request failed (${response.status}): ${body}`)
    }

    return (await response.json()) as T
  }
}

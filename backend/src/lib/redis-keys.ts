const tenantPrefix = (tenantId: string) => `tenant:${tenantId}`

export const cartKey = (tenantId: string, cartId: string) =>
  `${tenantPrefix(tenantId)}:cart:${cartId}`

export const rateLimitKey = (tenantId: string, ip: string, endpoint: string) =>
  `${tenantPrefix(tenantId)}:rate-limit:${ip}:${endpoint}`

export const idempotencyKey = (tenantId: string, key: string) =>
  `${tenantPrefix(tenantId)}:idempotency:${key}`

export const productCacheKey = (tenantId: string, slug: string) =>
  `${tenantPrefix(tenantId)}:product:${slug}`

export const categoryCacheKey = (tenantId: string, slug: string) =>
  `${tenantPrefix(tenantId)}:category:${slug}`

export const catalogListKey = (tenantId: string, hash: string) =>
  `${tenantPrefix(tenantId)}:catalog:list:${hash}`

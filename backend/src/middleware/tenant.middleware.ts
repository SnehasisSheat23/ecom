import type { MiddlewareHandler } from 'hono'

import { verifyAccessToken } from '../lib/auth.js'
import { isSuperAdminEmail } from '../lib/admin.js'
import { AppError } from '../lib/errors.js'
import type { AppBindings } from '../lib/http.js'
import type { TenancyService } from '../layers/tenancy/tenancy.service.js'
import type { UsersService } from '../modules/users/users.service.js'

export const createTenantMiddleware = (
  service: TenancyService,
  usersService?: UsersService,
): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    // Skip tenant resolution for OPTIONS (CORS Preflight)
    if (c.req.method === 'OPTIONS') {
      await next()
      return
    }

    const tenantIdHeader = c.req.header('x-tenant-id') || c.req.header('X-Tenant-Id')
    let tenant = null

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (tenantIdHeader && UUID_REGEX.test(tenantIdHeader)) {
      tenant = await service.getTenantContext(tenantIdHeader)
    } else if (tenantIdHeader) {
      tenant = await service.resolveBySlug(tenantIdHeader)
    }

    if (!tenant) {
      const hostname = new URL(c.req.url).hostname
      tenant = await service.resolveByHostname(hostname)
      
      // Fallback for local development when running on localhost / 127.0.0.1
      if (!tenant && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        tenant = await service.resolveBySlug('abdullah-bakheet')
      }
    }

    if (!tenant) {
      throw new AppError(tenantIdHeader ? 'Tenant not found for ID' : 'Tenant not found for hostname', 404, 'tenant-not-found')
    }

    const isPlatformAdmin = await hasSuperAdminToken(c, usersService)

    if (tenant.status === 'suspended' && !isPlatformAdmin) {
      throw new AppError('Tenant is suspended', 503, 'tenant-suspended')
    }

    if (tenant.status === 'onboarding' && !isPlatformAdmin) {
      throw new AppError('Tenant is onboarding', 403, 'tenant-onboarding')
    }

    c.set('tenant', tenant)
    await next()
  }
}

const hasSuperAdminToken = async (
  c: Parameters<MiddlewareHandler<AppBindings>>[0],
  usersService?: UsersService,
): Promise<boolean> => {
  const header = c.req.header('authorization')
  if (!header) {
    return false
  }

  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) {
    return false
  }

  try {
    const payload = await verifyAccessToken(token)
    if (usersService && payload.sub) {
      try {
        const user = await usersService.getAuthenticatedUser(payload.sub)
        if (user.isPlatformAdmin) return true
      } catch {}
    }
    return isSuperAdminEmail(payload.email)
  } catch {
    return false
  }
}

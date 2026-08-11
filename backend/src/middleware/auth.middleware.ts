import { getCookie } from 'hono/cookie'
import type { MiddlewareHandler } from 'hono'

import { verifyAccessToken } from '../lib/auth.js'
import { isSuperAdminEmail } from '../lib/admin.js'
import { AppError } from '../lib/errors.js'
import type { AppBindings } from '../lib/http.js'
import type { Database } from '../lib/db.js'
import type { CustomersService } from '../modules/customers/customers.service.js'
import type { UsersService } from '../modules/users/users.service.js'
import { createPlatformAuthInstance } from '../modules/auth/providers/platform-better-auth.js'

export const createAuthMiddleware = (
  service: CustomersService,
  options: { optional?: boolean } = {},
): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const header = c.req.header('authorization')
    const cookieToken = getCookie(c, 'vendor_auth_token')
    
    if (!header && !cookieToken) {
      if (options.optional) {
        await next()
        return
      }
      throw new AppError('Authentication required', 401, 'authentication-required')
    }

    try {
      const token = header ? header.replace(/^Bearer\s+/i, '') : cookieToken!
      const payload = await verifyAccessToken(token)
      const tenant = c.get('tenant')
      const isSuperAdmin = isSuperAdminEmail(payload.email)

      if (tenant.status === 'suspended' && !isSuperAdmin) {
        throw new AppError('Tenant is suspended', 403, 'tenant-suspended')
      }

      if (payload.tenantId !== tenant.tenantId && !isSuperAdmin) {
        throw new AppError('Invalid token', 401, 'invalid-token')
      }

      const customer =
        isSuperAdmin && payload.tenantId !== tenant.tenantId
          ? {
              customerId: payload.sub,
              tenantId: tenant.tenantId,
              partnerMemberships: [],
              activePartnerId: null,
              email: payload.email,
              isAdmin: true,
              isSuperAdmin: true,
            }
          : await service.getAuthenticatedCustomer(payload.sub, tenant.tenantId, payload.activePartnerId)

      if (customer.tenantId !== payload.tenantId && !customer.isSuperAdmin) {
        throw new AppError('Invalid token', 401, 'invalid-token')
      }

      c.set('customer', customer)
      c.set('isAdmin', customer.isAdmin)
      c.set('isSuperAdmin', customer.isSuperAdmin)
      if (customer.activePartnerId) {
        c.set('activePartnerId', customer.activePartnerId)
      }
    } catch (err) {
      if (options.optional) {
        await next()
        return
      }
      throw err
    }
    await next()
  }
}

export const createPlatformAuthMiddleware = (
  usersService: UsersService,
  customersService?: CustomersService,
): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const env = (c.env as Record<string, string>) || (process.env as Record<string, string>) || {}
    
    // 1. Better Auth Session Verification
    if (env.DATABASE_URL) {
      try {
        const auth = createPlatformAuthInstance(env)
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })

        if (session && session.user) {
          const user = await usersService.getAuthenticatedUser(session.user.id)
          const isPlatformAdmin = user.isPlatformAdmin || isSuperAdminEmail(user.email)
          const tenant = c.get('tenant')

          if (!isPlatformAdmin && user.tenantId && user.tenantId !== tenant.tenantId) {
            throw new AppError('Invalid token for tenant', 401, 'invalid-token')
          }

          const actor = {
            customerId: user.id,
            tenantId: tenant?.tenantId || user.tenantId,
            partnerMemberships: [],
            activePartnerId: null,
            email: user.email,
            isAdmin: true,
            isSuperAdmin: isPlatformAdmin,
            role: isPlatformAdmin ? 'PLATFORM_ADMIN' : 'TENANT_ADMIN',
          }

          c.set('customer', actor as any)
          c.set('isAdmin', true)
          c.set('isSuperAdmin', isPlatformAdmin)
          await next()
          return
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err
      }
    }

    // 2. Bearer JWT Token Verification Fallback
    const header = c.req.header('authorization')
    const cookieToken = getCookie(c, 'vendor_auth_token') || getCookie(c, 'admin_auth_token')

    if (!header && !cookieToken) {
      throw new AppError('Authentication required', 401, 'authentication-required')
    }

    const token = header ? header.replace(/^Bearer\s+/i, '') : cookieToken!
    const payload = await verifyAccessToken(token)
    const tenant = c.get('tenant')

    let user
    try {
      user = await usersService.getAuthenticatedUser(payload.sub)
    } catch (err: any) {
      if (customersService && (err?.code === 'user-not-found' || err?.statusCode === 404)) {
        try {
          const customer = await customersService.getAuthenticatedCustomer(payload.sub, tenant.tenantId, payload.activePartnerId)
          c.set('customer', customer)
          c.set('isAdmin', customer.isAdmin)
          c.set('isSuperAdmin', customer.isSuperAdmin)
          await next()
          return
        } catch (cErr) {
          throw new AppError('Authentication required - session invalid', 401, 'authentication-required')
        }
      }
      if (err?.code === 'user-not-found' || err?.statusCode === 404) {
        throw new AppError('Authentication required - session invalid', 401, 'authentication-required')
      }
      throw err
    }

    const isPlatformAdmin = user.isPlatformAdmin || isSuperAdminEmail(user.email)

    if (tenant.status === 'suspended' && !isPlatformAdmin) {
      throw new AppError('Tenant is suspended', 503, 'tenant-suspended')
    }

    if (!isPlatformAdmin && user.tenantId && user.tenantId !== tenant.tenantId) {
      throw new AppError('Invalid token for tenant', 401, 'invalid-token')
    }

    const actor = {
      customerId: user.id,
      tenantId: tenant.tenantId,
      partnerMemberships: [],
      activePartnerId: payload.activePartnerId || null,
      email: user.email,
      isAdmin: true,
      isSuperAdmin: isPlatformAdmin,
      role: isPlatformAdmin ? 'PLATFORM_ADMIN' : 'TENANT_ADMIN',
    }

    c.set('customer', actor as any)
    c.set('isAdmin', true)
    c.set('isSuperAdmin', isPlatformAdmin)
    await next()
  }
}


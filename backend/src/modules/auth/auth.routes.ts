import { Hono } from 'hono'
import { z } from 'zod'
import { AuthService } from './auth.service.js'
import { getDatabase } from '../../lib/db.js'
import { AuthorizationService } from '../../layers/authorization/authorization.service.js'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'

import { createPlatformAuthInstance } from './providers/platform-better-auth.js'

const updateAuthConfigSchema = z.object({
  enableEmailPassword: z.boolean().optional(),
  enablePhoneOtp: z.boolean().optional(),
  enableGoogleOAuth: z.boolean().optional(),
  enableMagicLink: z.boolean().optional(),
  primaryIdentifier: z.enum(['email', 'phone']).optional(),
})

export const createAuthRoutes = (
  authServiceFactory?: (db: any) => AuthService,
  authorizationService: AuthorizationService = new AuthorizationService(),
) => {
  const router = new Hono<AppBindings>()

  // Mount Native Better Auth Handler
  router.on(['POST', 'GET'], '/api/auth/*', async (c) => {
    const env = (c.env as Record<string, string>) || (process.env as Record<string, string>) || {}
    if (!env.DATABASE_URL) {
      throw new AppError('Database URL required for auth', 500, 'auth-config-error')
    }
    const auth = createPlatformAuthInstance(env)
    return auth.handler(c.req.raw)
  })

  const getService = (c: any) => {
    const db = getDatabase(c.env?.DATABASE_URL || process.env.DATABASE_URL)
    return authServiceFactory ? authServiceFactory(db) : new AuthService(db)
  }

  // GET /auth/config — Fetch active tenant's customer auth config
  router.get('/config', async (c) => {
    const tenant = c.get('tenant')
    if (!tenant) {
      throw new AppError('Tenant context required', 400, 'tenant-required')
    }

    const service = getService(c)
    const config = await service.getTenantAuthConfig(tenant.tenantId)

    return c.json({
      success: true,
      data: config,
    })
  })

  // PATCH /auth/config — Update tenant customer auth config (Store Admin only)
  router.patch('/config', async (c) => {
    const tenant = c.get('tenant')
    if (!tenant) {
      throw new AppError('Tenant context required', 400, 'tenant-required')
    }

    const actor = c.get('user') || c.get('customer')
    authorizationService.assertTenantAdmin(actor as any, tenant.tenantId)

    const body = await c.req.json().catch(() => ({}))
    const parsed = updateAuthConfigSchema.parse(body)

    const service = getService(c)
    const updated = await service.updateTenantAuthConfig(tenant.tenantId, parsed)

    return c.json({
      success: true,
      data: updated,
    })
  })

  return router
}

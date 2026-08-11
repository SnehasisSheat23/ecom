import type { MiddlewareHandler } from 'hono'
import { AuthService } from '../modules/auth/auth.service.js'
import { getDatabase } from '../lib/db.js'
import type { AppBindings } from '../lib/http.js'

export const createCustomerAuthGatekeeperMiddleware = (): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const tenant = c.get('tenant')
    if (tenant) {
      const db = getDatabase(c.env?.DATABASE_URL)
      const authService = new AuthService(db)
      const config = await authService.getTenantAuthConfig(tenant.tenantId)

      const path = c.req.path
      if (path.includes('/otp')) {
        authService.assertStrategyAllowed(config, 'phone_otp')
      } else if (path.includes('/google')) {
        authService.assertStrategyAllowed(config, 'google')
      } else if (path.includes('/magic-link')) {
        authService.assertStrategyAllowed(config, 'magic_link')
      } else if (path.includes('/email') || path.includes('/login')) {
        authService.assertStrategyAllowed(config, 'email')
      }
    }
    await next()
  }
}

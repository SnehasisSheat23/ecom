import type { MiddlewareHandler } from 'hono'
import { createPlatformAuthInstance } from '../modules/auth/providers/platform-better-auth.js'
import { AppError } from '../lib/errors.js'
import type { AppBindings } from '../lib/http.js'

export const createPlatformAuthMiddleware = (): MiddlewareHandler<AppBindings> => {
  return async (c, next) => {
    const auth = createPlatformAuthInstance(c.env as any)
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new AppError('Platform authentication required', 401, 'auth-required')
    }

    c.set('user' as any, session.user)
    await next()
  }
}

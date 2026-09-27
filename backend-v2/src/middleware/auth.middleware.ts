import type { Context, Next } from 'hono'
import { auth } from '../lib/better-auth.js'

export async function requireAdminAuth(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (session?.user) {
      const user = session.user as any
      if (user.role === 'admin' || user.role === 'superadmin') {
        c.set('admin', user)
        c.set('userId', user.id)
        c.set('userRole', user.role)
        return await next()
      } else {
        return c.json({ success: false, error: 'Forbidden: Admin privileges required' }, 403)
      }
    }
  } catch (err) {
    console.error('requireAdminAuth error:', err)
  }

  return c.json({ success: false, error: 'Unauthorized: Admin authentication session required' }, 401)
}

export async function requireCustomerAuth(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (session?.user?.id) {
      c.set('customer', session.user)
      c.set('customerId', session.user.id)
      return await next()
    }
  } catch (err) {
    console.error('requireCustomerAuth error:', err)
  }

  return c.json({ success: false, error: 'Unauthorized: Customer sign-in required' }, 401)
}

export async function optionalAuth(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (session?.user?.id) {
      const user = session.user as any
      if (user.role === 'admin' || user.role === 'superadmin') {
        c.set('admin', user)
      }
      c.set('customer', user)
      c.set('customerId', user.id)
      c.set('userId', user.id)
    }
  } catch {
    // No active session
  }

  await next()
}

export const optionalCustomerAuth = optionalAuth

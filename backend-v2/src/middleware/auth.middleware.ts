import type { Context, Next } from 'hono'
import { verifyJwt, type JwtPayload } from '../lib/auth-crypto.js'

const JWT_SECRET = process.env.APP_SECRET || process.env.JWT_SECRET || 'dubai-ecom-secure-jwt-secret-key-2026'

export async function requireAdminAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: Admin authentication token required' }, 401)
  }

  const token = authHeader.substring(7).trim()
  const payload = verifyJwt<JwtPayload>(token, JWT_SECRET)

  if (!payload || payload.type !== 'admin') {
    return c.json({ success: false, error: 'Unauthorized: Invalid or expired admin session' }, 401)
  }

  c.set('admin', payload)
  c.set('userId', payload.sub)
  c.set('userRole', payload.role || 'admin')
  await next()
}

export async function requireCustomerAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: Customer sign-in required' }, 401)
  }

  const token = authHeader.substring(7).trim()
  const payload = verifyJwt<JwtPayload>(token, JWT_SECRET)

  if (!payload || payload.type !== 'customer') {
    return c.json({ success: false, error: 'Unauthorized: Invalid or expired customer session' }, 401)
  }

  c.set('customer', payload)
  c.set('customerId', payload.sub)
  await next()
}

export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    const payload = verifyJwt<JwtPayload>(token, JWT_SECRET)
    if (payload) {
      if (payload.type === 'admin') {
        c.set('admin', payload)
      } else if (payload.type === 'customer') {
        c.set('customer', payload)
      }
    }
  }
  await next()
}

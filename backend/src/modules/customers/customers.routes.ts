import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { and, desc, eq } from 'drizzle-orm'
import { AppError } from '../../lib/errors.js'
import { orders } from '../orders/orders.schema.js'

import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.middleware.js'
import type { AppBindings } from '../../lib/http.js'
import type { CustomersService } from './customers.service.js'
import type { UsersService } from '../users/users.service.js'
import {
  addressSchema,
  activeVendorSchema,
  confirmPasswordResetSchema,
  googleOAuthSchema,
  loginSchema,
  profileSchema,
  refreshSchema,
  registerSchema,
  requestPasswordResetSchema,
  updateAddressSchema,
} from './customers.validators.js'

import { getOptionalEnv } from '../../lib/env.js'
import { toPublicCustomer } from './customers.types.js'


const REFRESH_COOKIE = 'refresh_token'

// Strict limits for production readiness (10 attempts per 15 mins)
const authRateLimit = createRateLimitMiddleware({ limit: 10, windowMs: 15 * 60 * 1000 })

export const createCustomersRoutes = (service: CustomersService, usersService?: UsersService) => {
  const isProduction = getOptionalEnv('NODE_ENV') === 'production'
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(service)

  app.post('/auth/register', authRateLimit, async (c) => {
    const payload = registerSchema.parse(await c.req.json())
    const tenant = c.get('tenant')
    const result = await service.register(payload, tenant.tenantId, tenant.mode)
    setCookie(c, REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      path: '/',
      secure: isProduction,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    return c.json({ data: { customer: toPublicCustomer(result.customer), accessToken: result.accessToken } }, 201)
  })

  app.post('/auth/login', authRateLimit, async (c) => {
    try {
      const body = await c.req.json()
      const payload = loginSchema.parse(body)
      const tenant = c.get('tenant')
      
      let result;
      if (payload.phone) {
        result = await service.authenticate({
          email: payload.email,
          phone: payload.phone,
          guestSessionId: payload.guestSessionId,
          items: payload.items,
        }, tenant.tenantId, tenant.mode)
      } else if (payload.password) {
        if (usersService && (await usersService.findByEmail(payload.email, tenant.tenantId))) {
          const userResult = await usersService.login(payload.email, payload.password, tenant.tenantId)
          setCookie(c, REFRESH_COOKIE, userResult.refreshToken, {
            httpOnly: true,
            path: '/',
            secure: isProduction,
            sameSite: 'Lax',
            maxAge: 60 * 60 * 24 * 30,
          })
          return c.json({
            data: {
              customer: {
                id: userResult.user.id,
                email: userResult.user.email,
                firstName: userResult.user.firstName,
                lastName: userResult.user.lastName,
                isAdmin: true,
                isSuperAdmin: userResult.user.isPlatformAdmin,
              },
              accessToken: userResult.accessToken,
            },
          })
        }

        result = await service.login({
          email: payload.email,
          password: payload.password,
          guestSessionId: payload.guestSessionId,
          items: payload.items,
        }, tenant.tenantId, tenant.mode)
      } else {
        return c.json({ error: 'Password or Phone number required', code: 'invalid-request' }, 400)
      }

      setCookie(c, REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        path: '/',
        secure: isProduction,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 30,
      })
      return c.json({ data: { customer: toPublicCustomer(result.customer), accessToken: result.accessToken } })
    } catch (err: any) {
      // Handle Zod validation errors with field-level details
      if (err.name === 'ZodError') {
        return c.json({ error: 'Validation failed', code: 'validation-error', details: err.errors }, 400);
      }

      const status = err.statusCode || err.status || 500;
      const code = err.code || 'internal-error';
      // Never leak internal error messages to client on 5xx
      const message = status < 500 ? (err.message || 'Request failed') : 'Internal server error';

      if (status >= 500) {
        console.error('[auth/login] Unhandled:', err.message);
      }

      return c.json({ error: message, code }, status);
    }
  })

  app.post('/auth/refresh', async (c) => {
    const payload = refreshSchema.parse(await c.req.json().catch(() => ({})))
    const oldRefreshToken = payload.refreshToken ?? getCookie(c, REFRESH_COOKIE)
    if (!oldRefreshToken) {
      return c.json({ error: 'Refresh token missing', code: 'refresh-token-missing' }, 401)
    }
    const result = await service.refreshToken(oldRefreshToken, c.get('tenant').tenantId, c.get('tenant').mode)
    // Rotate: set the new refresh token cookie
    setCookie(c, REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      path: '/',
      secure: isProduction,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    return c.json({ data: { accessToken: result.accessToken } })
  })

  app.post('/auth/logout', async (c) => {
    const refreshToken = getCookie(c, REFRESH_COOKIE)
    if (refreshToken) {
      await service.logout(refreshToken, c.get('tenant').tenantId)
    }
    deleteCookie(c, REFRESH_COOKIE, { path: '/' })
    return c.json({ data: { ok: true } })
  })

  app.post('/auth/password/reset', authRateLimit, async (c) => {
    const payload = requestPasswordResetSchema.parse(await c.req.json())
    const result = await service.requestPasswordReset(payload.email, c.get('tenant').tenantId)
    return c.json({
      data: {
        ok: true,
        otp: isProduction ? undefined : result.otp,
      },
    })
  })

  app.post('/auth/password/confirm', authRateLimit, async (c) => {
    const payload = confirmPasswordResetSchema.parse(await c.req.json())
    await service.confirmPasswordReset(
      payload.email,
      payload.otp,
      payload.newPassword,
      c.get('tenant').tenantId,
    )
    return c.json({ data: { ok: true } })
  })

  app.post('/auth/google', async (c) => {
    const payload = googleOAuthSchema.parse(await c.req.json())
    const result = await service.googleOAuth(payload, c.get('tenant').tenantId, c.get('tenant').mode)
    setCookie(c, REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      path: '/',
      secure: isProduction,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    return c.json({ data: { customer: toPublicCustomer(result.customer), accessToken: result.accessToken } })
  })

  app.post('/guest-sessions', async (c) =>
    c.json({ data: await service.createGuestSession(c.get('tenant').tenantId) }, 201),
  )

  app.use('/me', authRequired)
  app.use('/me/*', authRequired)

  app.get('/me', async (c) => {
    const profile = await service.getProfile(c.get('customer')!.customerId, c.get('customer')!.tenantId)
    return c.json({ data: toPublicCustomer(profile) })
  })
  app.patch('/me', async (c) => {
    const updated = await service.updateProfile(
      c.get('customer')!.customerId,
      c.get('customer')!.tenantId,
      profileSchema.parse(await c.req.json()),
    )
    return c.json({ data: toPublicCustomer(updated) })
  })

  app.get('/me/addresses', async (c) =>
    c.json({ data: await service.listAddresses(c.get('customer')!.customerId, c.get('customer')!.tenantId) }),
  )
  app.get('/me/vendor-memberships', async (c) =>
    c.json({ data: c.get('customer')!.partnerMemberships }),
  )
  app.post('/me/active-vendor', async (c) => {
    const payload = activeVendorSchema.parse(await c.req.json())
    const result = await service.setActiveVendor(
      c.get('customer')!.customerId,
      c.get('customer')!.tenantId,
      payload.partnerId,
      c.get('tenant').mode,
    )

    return c.json({ data: result })
  })
  app.post('/me/addresses', async (c) =>
    c.json(
      {
        data: await service.createAddress(
          c.get('customer')!.customerId,
          c.get('customer')!.tenantId,
          addressSchema.parse(await c.req.json()),
        ),
      },
      201,
    ),
  )
  app.patch('/me/addresses/:id', async (c) =>
    c.json({
      data: await service.updateAddress(
        c.req.param('id'),
        c.get('customer')!.customerId,
        c.get('customer')!.tenantId,
        updateAddressSchema.parse(await c.req.json()),
      ),
    }),
  )
  app.delete('/me/addresses/:id', async (c) => {
    await service.deleteAddress(c.req.param('id'), c.get('customer')!.customerId, c.get('customer')!.tenantId)
    return c.json({ data: { ok: true } })
  })

  app.get('/admin/customers', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!actor.isAdmin && !actor.isSuperAdmin)) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    const tenantId = c.get('tenant').tenantId
    const query = c.req.query()
    const page = query.page ? parseInt(query.page, 10) : 1
    const perPage = query.perPage ? parseInt(query.perPage, 10) : 50
    const search = query.search || undefined

    const result = await service.listCustomers(tenantId, { page, perPage, search })
    const tenantCurrency = c.get('tenant').currency || c.get('tenant').config?.currency || 'INR'
    return c.json({
      data: {
        items: result.items.map(toPublicCustomer),
        page: result.page,
        perPage: result.perPage,
        total: result.total,
        currency: tenantCurrency,
      },
    })
  })

  app.get('/admin/customers/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!actor.isAdmin && !actor.isSuperAdmin)) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    const tenantId = c.get('tenant').tenantId
    const customerId = c.req.param('id')
    const customer = await service.getProfile(customerId, tenantId)
    let addresses = await service.listAddresses(customerId, tenantId)

    if (addresses.length === 0) {
      const db = service.getDb()
      const [latestOrder] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, tenantId), eq(orders.customerId, customerId)))
        .orderBy(desc(orders.createdAt))
        .limit(1)

      if (latestOrder?.shippingAddressSnapshot) {
        const snap = latestOrder.shippingAddressSnapshot as Record<string, any>
        addresses = [
          {
            id: 'default',
            tenantId,
            customerId,
            label: 'Default Address',
            line1: snap.line1 || snap.address || 'No address specified',
            line2: snap.line2 || null,
            city: snap.city || 'Mumbai',
            state: snap.state || 'Maharashtra',
            postalCode: snap.postalCode || '400001',
            country: snap.country || 'IN',
            phone: snap.phone || customer.phone || null,
            isDefaultShipping: true,
            isDefaultBilling: true,
            createdAt: latestOrder.createdAt,
            updatedAt: latestOrder.createdAt,
          } as any,
        ]
      }
    }

    return c.json({
      data: {
        ...toPublicCustomer(customer),
        addresses,
      },
    })
  })

  return app
}

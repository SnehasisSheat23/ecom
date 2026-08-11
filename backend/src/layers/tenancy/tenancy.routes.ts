import { Hono } from 'hono'

import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import {
  createTenantSchema,
  tenantAdminBodySchema,
  tenantAdminParamsSchema,
  updatePaymentConfigSchema,
  updateTenantConfigSchema,
  updateTenantSchema,
  updateTenantStatusSchema,
} from './tenancy.validators.js'
import type { TenancyService } from './tenancy.service.js'
import { toPublicCustomer } from '../../modules/customers/customers.types.js'


export const createTenancyRoutes = (service?: TenancyService) => {
  const app = new Hono<AppBindings>()

  const requireSuperAdmin = (isSuperAdmin?: boolean) => {
    if (!isSuperAdmin) {
      throw new AppError('Super admin access required', 403, 'forbidden')
    }
  }

  app.post('/admin/tenants', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const payload = createTenantSchema.parse(await c.req.json())
    const tenant = await service.createTenant(payload)
    return c.json({ data: tenant }, 201)
  })

  app.get('/admin/tenants', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const page = Number(c.req.query('page') ?? '1')
    const perPage = Number(c.req.query('perPage') ?? '20')
    return c.json({ data: await service.listTenants(page, perPage) })
  })

  app.get('/admin/tenants/:id', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    return c.json({ data: await service.getTenant(c.req.param('id')) })
  })

  app.patch('/admin/tenants/:id', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const payload = updateTenantSchema.parse(await c.req.json())
    return c.json({ data: await service.updateTenant(c.req.param('id'), payload) })
  })

  app.patch('/admin/tenants/:id/status', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const payload = updateTenantStatusSchema.parse(await c.req.json())
    return c.json({ data: await service.updateStatus(c.req.param('id'), payload.status) })
  })

  app.put('/admin/tenants/:id/config', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const payload = updateTenantConfigSchema.parse(await c.req.json())
    return c.json({ data: await service.updateConfig(c.req.param('id'), payload) })
  })

  app.put('/admin/tenants/:id/payment', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const payload = updatePaymentConfigSchema.parse(await c.req.json())
    return c.json({ data: await service.updatePaymentConfig(c.req.param('id'), payload) })
  })

  app.post('/admin/tenants/:id/admins', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const params = tenantAdminBodySchema.parse(await c.req.json())
    const customer = await service.grantTenantAdmin(c.req.param('id'), params.customerId)
    return c.json({ data: toPublicCustomer(customer) }, 201)
  })

  app.delete('/admin/tenants/:id/admins/:customerId', async (c) => {
    requireSuperAdmin(c.get('isSuperAdmin'))
    if (!service) return c.json({ error: 'Tenancy service not configured' }, 500)
    const params = tenantAdminParamsSchema.parse(c.req.param())
    const customer = await service.revokeTenantAdmin(params.id, params.customerId)
    return c.json({ data: toPublicCustomer(customer) })
  })


  return app
}

import { Hono } from 'hono'
import type { AppBindings } from '../../lib/http.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'
import type { CustomersService } from '../customers/customers.service.js'
import type { AnalyticsService } from './analytics.service.js'

export const createAnalyticsRoutes = (service: AnalyticsService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)

  // Admin Dashboard Stats
  app.get('/admin/dashboard', authRequired, async (c) => {
    const user = c.get('customer')
    if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    const tenantId = c.get('tenant').tenantId

    const data = await service.getAdminDashboard(tenantId)
    return c.json({ data })
  })

  // Admin: Per-vendor summary
  app.get('/admin/analytics/vendors', authRequired, async (c) => {
    if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
      return c.json({ error: 'Admin access required' }, 403)
    }
    const tenantId = c.get('tenant').tenantId
    const data = await service.getAdminVendors(tenantId)
    return c.json({ data })
  })

  // Admin: Global Ledger audit
  app.get('/admin/analytics/ledger', authRequired, async (c) => {
    if (!c.get('isAdmin') && !c.get('isSuperAdmin')) {
      return c.json({ error: 'Admin access required' }, 403)
    }
    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '20')
    const tenantId = c.get('tenant').tenantId
    const data = await service.getAdminLedger(tenantId, page, perPage)
    return c.json({ data })
  })

  // Vendor Dashboard Stats
  app.get('/vendor/dashboard', authRequired, async (c) => {
    const partnerId = c.get('activePartnerId')
    if (!partnerId) {
      return c.json({ error: 'Vendor context required' }, 403)
    }

    const page = Number(c.req.query('page') || '1')
    const perPage = Number(c.req.query('perPage') || '10')
    const tenantId = c.get('tenant').tenantId

    const data = await service.getVendorDashboard(tenantId, partnerId)
    return c.json({ data })
  })

  return app
}

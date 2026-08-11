import { Hono } from 'hono'
import { SupportService } from './support.service.js'
import { 
  createTicketSchema, 
  addMessageSchema, 
  updateTicketSchema, 
  listTicketsQuerySchema 
} from './support.validators.js'
import { AppError } from '../../lib/errors.js'
import type { AppBindings } from '../../lib/http.js'
import type { CustomersService } from '../customers/customers.service.js'
import { createAuthMiddleware } from '../../middleware/auth.middleware.js'

export const createSupportRoutes = (service: SupportService, customersService: CustomersService) => {
  const app = new Hono<AppBindings>()
  const authRequired = createAuthMiddleware(customersService)

  app.use('/tickets', authRequired)
  app.use('/tickets/*', authRequired)
  app.use('/vendor/tickets', authRequired)
  app.use('/vendor/tickets/*', authRequired)

  // --- Customer Endpoints ---
  app.post('/tickets', async (c) => {
    const actor = c.get('customer')
    if (!actor) throw new AppError('Authentication required', 401, 'unauthorized')
    
    const body = await c.req.json()
    const input = createTicketSchema.parse(body)
    
    return c.json({ data: await service.createTicket(actor, input) })
  })

  app.get('/tickets', async (c) => {
    const actor = c.get('customer')
    if (!actor) throw new AppError('Authentication required', 401, 'unauthorized')
    
    const { page, perPage } = listTicketsQuerySchema.parse(c.req.query())
    return c.json({ data: await service.listCustomerTickets(actor, page, perPage) })
  })

  app.get('/tickets/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor) throw new AppError('Authentication required', 401, 'unauthorized')
    
    return c.json({ data: await service.getTicket(actor, c.req.param('id')) })
  })

  app.post('/tickets/:id/messages', async (c) => {
    const actor = c.get('customer')
    if (!actor) throw new AppError('Authentication required', 401, 'unauthorized')
    
    const body = await c.req.json()
    const input = addMessageSchema.parse(body)
    
    return c.json({ data: await service.addMessage(actor, c.req.param('id'), input) })
  })

  // --- Vendor Endpoints ---
  app.get('/vendor/tickets', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')
    
    const { page, perPage } = listTicketsQuerySchema.parse(c.req.query())
    return c.json({ data: await service.listVendorTickets(actor, page, perPage) })
  })

  app.get('/vendor/tickets/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')
    
    return c.json({ data: await service.getTicket(actor, c.req.param('id')) })
  })

  app.post('/vendor/tickets/:id/messages', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')
    
    const body = await c.req.json()
    const input = addMessageSchema.parse(body)
    
    return c.json({ data: await service.addMessage(actor, c.req.param('id'), input) })
  })

  app.patch('/vendor/tickets/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor?.activePartnerId) throw new AppError('Vendor access required', 403, 'forbidden')
    
    const body = await c.req.json()
    const input = updateTicketSchema.parse(body)
    
    return c.json({ data: await service.updateTicketStatus(actor, c.req.param('id'), input) })
  })

  // --- Admin Endpoints ---
  app.get('/admin/tickets', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
    
    const query = listTicketsQuerySchema.parse(c.req.query())
    let partnerId: string | null | undefined = query.partnerId
    if (partnerId === 'null') partnerId = null

    return c.json({ 
      data: await service.listAdminTickets(actor, { 
        partnerId, 
        status: query.status, 
        page: query.page, 
        perPage: query.perPage 
      }) 
    })
  })

  app.get('/admin/tickets/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
    
    return c.json({ data: await service.getTicket(actor, c.req.param('id')) })
  })

  app.post('/admin/tickets/:id/messages', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
    
    const body = await c.req.json()
    const input = addMessageSchema.parse(body)
    
    return c.json({ data: await service.addMessage(actor, c.req.param('id'), input) })
  })

  app.patch('/admin/tickets/:id', async (c) => {
    const actor = c.get('customer')
    if (!actor || (!c.get('isAdmin') && !c.get('isSuperAdmin'))) {
      throw new AppError('Admin access required', 403, 'forbidden')
    }
    
    const body = await c.req.json()
    const input = updateTicketSchema.parse(body)
    
    return c.json({ data: await service.updateTicketStatus(actor, c.req.param('id'), input) })
  })

  return app
}

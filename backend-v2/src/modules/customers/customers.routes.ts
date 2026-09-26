import { Hono } from 'hono'
import { CustomersService } from './customers.service.js'

const customersService = new CustomersService()

export const customersRoutes = new Hono()

// GET /api/v1/customers - List customers
customersRoutes.get('/', async (c) => {
  const q = c.req.query('q') || c.req.query('search')
  const status = c.req.query('status')
  const customerGroup = c.req.query('customerGroup') || c.req.query('group')
  const limit = c.req.query('perPage') ? parseInt(c.req.query('perPage')!) : (c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50)
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1

  const result = await customersService.getCustomers({ q, status, customerGroup, limit, page })
  return c.json({ success: true, data: result })
})

// PATCH /api/v1/customers/:id/status - Update customer status (approve, reject, suspend)
customersRoutes.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const updated = await customersService.updateCustomerStatus(id, body)
    if (!updated) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }
    return c.json({ success: true, data: updated, message: `Customer status updated to ${body.status}` })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update customer status' }, 400)
  }
})

// POST /api/v1/customers/:id/approve - One-click approval
customersRoutes.post('/:id/approve', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({}))
    const updated = await customersService.updateCustomerStatus(id, {
      status: 'approved',
      customerGroup: body.customerGroup || 'corporate',
      creditLimit: body.creditLimit || '10000.00',
      paymentTerms: body.paymentTerms || 'net_30',
    })
    if (!updated) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }
    return c.json({ success: true, data: updated, message: 'Corporate customer approved successfully.' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to approve customer' }, 400)
  }
})

// POST /api/v1/customers/:id/reject - One-click reject / suspend
customersRoutes.post('/:id/reject', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json().catch(() => ({}))
    const updated = await customersService.updateCustomerStatus(id, {
      status: 'rejected',
      rejectionReason: body.reason || 'Invalid commercial registration credentials',
    })
    if (!updated) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }
    return c.json({ success: true, data: updated, message: 'Corporate application rejected.' })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to reject customer' }, 400)
  }
})

// POST /api/v1/customers - Create customer
customersRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const customer = await customersService.createCustomer(body)
    return c.json({ success: true, data: customer }, 201)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to create customer' }, 400)
  }
})

// GET /api/v1/customers/:id - Customer details & address book
customersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const customer = await customersService.getCustomerById(id)
  if (!customer) {
    return c.json({ success: false, error: 'Customer not found' }, 404)
  }
  return c.json({ success: true, data: customer })
})

// PUT /api/v1/customers/:id - Update customer
customersRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const updated = await customersService.updateCustomer(id, body)
    if (!updated) {
      return c.json({ success: false, error: 'Customer not found' }, 404)
    }
    return c.json({ success: true, data: updated })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update customer' }, 400)
  }
})

// DELETE /api/v1/customers/:id - Delete customer
customersRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const deleted = await customersService.deleteCustomer(id)
  if (!deleted) {
    return c.json({ success: false, error: 'Customer not found' }, 404)
  }
  return c.json({ success: true, message: 'Customer deleted', data: deleted })
})

// ADDRESS ROUTES
// POST /api/v1/customers/:id/addresses - Add address
customersRoutes.post('/:id/addresses', async (c) => {
  try {
    const customerId = c.req.param('id')
    const body = await c.req.json()
    const address = await customersService.addAddress(customerId, body)
    return c.json({ success: true, data: address }, 201)
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to add address' }, 400)
  }
})

// GET /api/v1/customers/:id/addresses - List addresses
customersRoutes.get('/:id/addresses', async (c) => {
  const customerId = c.req.param('id')
  const addresses = await customersService.getAddresses(customerId)
  return c.json({ success: true, data: addresses })
})

// PUT /api/v1/customers/addresses/:addressId - Update address
customersRoutes.put('/addresses/:addressId', async (c) => {
  try {
    const addressId = c.req.param('addressId')
    const body = await c.req.json()
    const updated = await customersService.updateAddress(addressId, body)
    return c.json({ success: true, data: updated })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to update address' }, 400)
  }
})

// DELETE /api/v1/customers/addresses/:addressId - Delete address
customersRoutes.delete('/addresses/:addressId', async (c) => {
  const addressId = c.req.param('addressId')
  const deleted = await customersService.deleteAddress(addressId)
  return c.json({ success: true, message: 'Address deleted', data: deleted })
})

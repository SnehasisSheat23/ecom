import { Hono } from 'hono'
import { CustomersService } from './customers.service.js'

const customersService = new CustomersService()

export const customersRoutes = new Hono()

// GET /api/v1/customers - List customers
customersRoutes.get('/', async (c) => {
  const q = c.req.query('q') || c.req.query('search')
  const limit = c.req.query('perPage') ? parseInt(c.req.query('perPage')!) : (c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20)
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1

  const result = await customersService.getCustomers({ q, limit, page })
  return c.json({ success: true, data: result })
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

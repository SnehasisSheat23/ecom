import { Hono } from 'hono'
import { QuotationsService } from './quotations.service.js'
import { requireAdminAuth, optionalAuth } from '../../middleware/auth.middleware.js'

export const quotationsRoutes = new Hono()
const quotationsService = new QuotationsService()

// 1. Submit a Quotation Request (Public or Authenticated Customer)
quotationsRoutes.post('/request', optionalAuth, async (c) => {
  try {
    const body = await c.req.json()
    const customer = (c as any).get('customer')
    const customerId = customer?.sub || body.customerId

    const quotation = await quotationsService.createQuotationRequest({
      customerId,
      customerName: body.customerName || (customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Valued Customer'),
      customerEmail: body.customerEmail || customer?.email,
      customerPhone: body.customerPhone || customer?.phone,
      companyName: body.companyName || customer?.companyName,
      taxNumber: body.taxNumber || customer?.companyTaxId,
      currency: body.currency,
      customerNotes: body.customerNotes,
      items: body.items,
    })

    return c.json({
      success: true,
      data: quotation,
      message: 'Quotation request submitted successfully.',
    }, 201)
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Failed to submit quotation request' }, 400)
  }
})

// 2. List Quotations (Admin sees all; Customer sees their own)
quotationsRoutes.get('/', async (c) => {
  try {
    const customerId = c.req.query('customerId')
    const email = c.req.query('email')
    const status = c.req.query('status')
    const search = c.req.query('search')

    const list = await quotationsService.getQuotations({
      customerId,
      email,
      status,
      search,
    })

    return c.json({
      success: true,
      data: list,
    })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Failed to fetch quotations' }, 500)
  }
})

// 3. Get Single Quotation Detail
quotationsRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ success: false, message: 'Quotation ID required' }, 400)
    const quotation = await quotationsService.getQuotationById(id)
    return c.json({
      success: true,
      data: quotation,
    })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Quotation not found' }, 404)
  }
})

// 4. Admin Update Quotation (Set Quoted Unit Prices, Discount, Shipping, Status)
quotationsRoutes.patch('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ success: false, message: 'Quotation ID required' }, 400)
    const body = await c.req.json()
    const updated = await quotationsService.updateQuotationAdmin(id, body)

    return c.json({
      success: true,
      data: updated,
      message: 'Quotation updated successfully.',
    })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Failed to update quotation' }, 400)
  }
})

// 5. Accept & Convert Quotation to Order (Customer / Corporate Checkout)
quotationsRoutes.post('/:id/accept', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ success: false, message: 'Quotation ID required' }, 400)
    const body = await c.req.json()
    const customer = (c as any).get('customer')
    const customerId = customer?.sub || body.customerId

    const result = await quotationsService.acceptAndConvertToOrder(id, {
      customerId,
      paymentMethodType: body.paymentMethodType || 'CARD',
      paymentReceiptUrl: body.paymentReceiptUrl,
      poDocumentUrl: body.poDocumentUrl,
      poNumber: body.poNumber,
      shippingAddressSnapshot: body.shippingAddressSnapshot,
      billingAddressSnapshot: body.billingAddressSnapshot,
    })

    return c.json({
      success: true,
      data: result,
      message: 'Quotation accepted and order created successfully!',
    })
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Failed to accept quotation' }, 400)
  }
})

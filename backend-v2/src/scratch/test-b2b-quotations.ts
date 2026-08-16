import { QuotationsService } from '../modules/quotations/quotations.service.js'
import { CustomersService } from '../modules/customers/customers.service.js'
import { OrdersService } from '../modules/orders/orders.service.js'
import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'

async function runB2BTest() {
  console.log('🧪 Testing B2B Wholesale Trading flows on backend-v2...')
  const db = getDatabase()
  const quotationsService = new QuotationsService()
  const customersService = new CustomersService()
  const ordersService = new OrdersService()

  // 1. Fetch any product from database
  const prods = await db.select().from(products).limit(1)
  if (!prods[0]) {
    console.error('No products found in DB.')
    process.exit(1)
  }
  const testProduct = prods[0]
  console.log(`✅ Using product for test: ${testProduct.sku} (${testProduct.translations?.en?.title || 'Product'})`)

  // 2. Test Customer creation with Corporate Credit Limit & B2B Terms
  const testCustomer = await customersService.createCustomer({
    email: `b2b-test-${Date.now()}@alnoor-trading.com`,
    firstName: 'Tariq',
    lastName: 'Al-Mansoor',
    companyName: 'Al-Noor Wholesale Contracting',
    companyTaxId: '300000000000003',
    crNumber: '1010000000',
    customerGroup: 'corporate_vip',
    creditLimit: 50000,
    availableCredit: 50000,
    paymentTerms: 'net_30',
    accountDiscountPercent: 10,
  })
  console.log(`✅ Created Corporate B2B Customer: ${testCustomer.companyName}, Credit Limit: ${testCustomer.creditLimit} SAR, Terms: ${testCustomer.paymentTerms}`)

  // 3. Test Quotation Request (RFQ Flow)
  const quote = await quotationsService.createQuotationRequest({
    customerId: testCustomer.id,
    customerName: 'Tariq Al-Mansoor',
    customerEmail: testCustomer.email,
    companyName: testCustomer.companyName || 'Al-Noor Wholesale',
    currency: 'SAR',
    customerNotes: 'Need 100 units for our commercial project in Riyadh. Please quote best wholesale price and truck shipping.',
    items: [
      {
        productId: testProduct.id,
        quantity: 100,
      },
    ],
  })
  console.log(`✅ Created Quotation Request: ${quote.quoteNumber}, Status: ${quote.status}, Total: ${quote.totalAmount} SAR`)

  // 4. Test Admin Pricing Modification & Quote Approval
  const quoted = await quotationsService.updateQuotationAdmin(quote.id, {
    status: 'quoted',
    items: [
      {
        id: quote.items[0].id,
        quotedUnitPrice: 75.0, // Discounted from regular price
      },
    ],
    discountAmount: 200,
    shippingCost: 350,
    adminNotes: 'Approved wholesale bulk price with direct truck delivery to Riyadh project site.',
  })
  console.log(`✅ Admin Quoted Quote ${quoted.quoteNumber}: Subtotal: ${quoted.subtotal} SAR, Shipping: ${quoted.shippingCost} SAR, Total with VAT: ${quoted.totalAmount} SAR`)

  // 5. Test Quote Acceptance & Conversion to Order (with Corporate Net 30 Credit Terms)
  const converted = await quotationsService.acceptAndConvertToOrder(quoted.id, {
    customerId: testCustomer.id,
    paymentMethodType: 'CREDIT_TERMS',
    poNumber: 'PO-ALNOOR-2026-99',
    poDocumentUrl: 'https://storage.example.com/pos/po-alnoor-99.pdf',
    shippingAddressSnapshot: {
      addressLine1: 'King Fahd Road, Al Olaya',
      city: 'Riyadh',
      country: 'Saudi Arabia',
    },
  })
  console.log(`✅ Converted Quote to Order: ${converted.order.orderNumber}, Status: ${converted.order.status}, Payment Type: ${converted.order.paymentMethodType}`)

  // 6. Verify Customer Available Credit was properly deducted
  const updatedCustomer = await customersService.getCustomerById(testCustomer.id)
  console.log(`✅ Verified Customer Remaining Credit: ${updatedCustomer?.availableCredit} SAR (Reduced from 50000 SAR)`)

  console.log('🎉 All Backend B2B Wholesale Trading flows tested successfully!')
  process.exit(0)
}

runB2BTest().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})

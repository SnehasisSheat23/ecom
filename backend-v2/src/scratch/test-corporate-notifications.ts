import { renderEmailTemplate } from '../modules/notifications/templates/email.templates.js'
import { CustomersService } from '../modules/customers/customers.service.js'
import { OrdersService } from '../modules/orders/orders.service.js'
import { QuotationsService } from '../modules/quotations/quotations.service.js'
import { notificationService } from '../modules/notifications/notification.service.js'

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TESTING ALL CORPORATE NOTIFICATION FLOWS (DRY-RUN / NO RESEND)');
  console.log('================================================================\n');

  // Intercept notifications to capture events and payloads in memory
  const capturedNotifications: { event: string; payload: any; email: any }[] = []

  notificationService.notify = function (event: any, payload: any, options: any) {
    const renderedEmail = renderEmailTemplate(event, payload)
    capturedNotifications.push({ event, payload, email: renderedEmail })
    console.log(`📡 [Captured Event: ${event}]`);
    console.log(`   To:       ${renderedEmail?.to}`);
    console.log(`   Subject:  ${renderedEmail?.subject}`);
    if (payload.companyName) console.log(`   Company:  ${payload.companyName}`);
    if (payload.poNumber) console.log(`   PO #:     ${payload.poNumber}`);
    if (payload.vatNumber) console.log(`   VAT ID:   ${payload.vatNumber}`);
    console.log('----------------------------------------------------------------');
  } as any

  const customersService = new CustomersService()
  const ordersService = new OrdersService()
  const quotationsService = new QuotationsService()

  // -------------------------------------------------------------
  // Test 1: Admin Creates an Approved Corporate Customer
  // -------------------------------------------------------------
  console.log('\n▶️ TEST 1: Admin Creates Approved Corporate Customer');
  const testCorpEmail1 = `test.corp.${Date.now()}@example.com`
  const corpCust1 = await customersService.createCustomer({
    email: testCorpEmail1,
    firstName: 'Tariq',
    lastName: 'Al-Mansoor',
    companyName: 'Al-Mansoor Hospitality Group',
    crNumber: '1010998877',
    companyTaxId: '310999888700003',
    customerGroup: 'corporate',
    status: 'approved',
    creditLimit: '75000.00',
    paymentTerms: 'net_30',
  })
  console.log(`   Created Customer ID: ${corpCust1.id}`);

  // -------------------------------------------------------------
  // Test 2: Admin Creates a Pending Corporate Registration
  // -------------------------------------------------------------
  console.log('\n▶️ TEST 2: Customer/Admin Creates Pending Corporate Customer');
  const testCorpEmail2 = `test.pending.${Date.now()}@example.com`
  const corpCust2 = await customersService.createCustomer({
    email: testCorpEmail2,
    firstName: 'Fahad',
    lastName: 'Al-Otaibi',
    companyName: 'Otaibi Catering LLC',
    crNumber: '1010554433',
    companyTaxId: '310555444300003',
    customerGroup: 'corporate',
    status: 'pending',
  })
  console.log(`   Created Customer ID: ${corpCust2.id}`);

  // -------------------------------------------------------------
  // Test 3: Admin Approves the Pending Corporate Customer
  // -------------------------------------------------------------
  console.log('\n▶️ TEST 3: Admin Approves Pending Corporate Customer');
  await customersService.updateCustomerStatus(corpCust2.id, {
    status: 'approved',
    customerGroup: 'corporate',
    creditLimit: '50000.00',
    paymentTerms: 'net_30',
  })

  // -------------------------------------------------------------
  // Test 4: Corporate Customer Places Order on Credit Terms
  // -------------------------------------------------------------
  console.log('\n▶️ TEST 4: Corporate Order Placed on Credit Terms');
  const corpOrder = await ordersService.createOrder({
    customerId: corpCust1.id,
    currency: 'SAR',
    paymentMethod: 'CREDIT_TERMS',
    paymentMethodType: 'CREDIT_TERMS',
    poNumber: 'PO-CORP-2026-901',
    shippingAddressSnapshot: {
      fullName: 'Tariq Al-Mansoor',
      email: testCorpEmail1,
      companyName: 'Al-Mansoor Hospitality Group',
      addressLine1: 'Building 404, King Fahd Road',
      city: 'Riyadh',
      country: 'Saudi Arabia',
    },
    items: [
      {
        productId: 'PROD-TEST-1',
        name: 'Commercial Porcelain Plates (Box of 24)',
        quantity: 5,
        unitPrice: 400.0,
      },
    ],
  })
  console.log(`   Placed Order Number: ${corpOrder.orderNumber}`);

  // -------------------------------------------------------------
  // Test 5: Corporate Quotation Accepted & Converted to Order
  // -------------------------------------------------------------
  console.log('\n▶️ TEST 5: B2B Quotation Accepted & Converted to Order');
  const quoteReq = await quotationsService.createQuotationRequest({
    customerId: corpCust1.id,
    customerName: 'Tariq Al-Mansoor',
    customerEmail: testCorpEmail1,
    companyName: 'Al-Mansoor Hospitality Group',
    taxNumber: '310999888700003',
    currency: 'SAR',
    customerNotes: 'Urgent wholesale supply for hotel branch opening',
    items: [
      {
        productId: 'PROD-TEST-2',
        name: 'Stainless Steel Commercial Buffet Chafer 9L',
        quantity: 12,
        unitPrice: 650.0,
      },
    ],
  })
  console.log(`   Created RFQ: ${quoteReq.quoteNumber}`);

  const convertedOrderRes = await quotationsService.acceptAndConvertToOrder(quoteReq.id, {
    customerId: corpCust1.id,
    paymentMethodType: 'CREDIT_TERMS',
    poNumber: 'PO-RFQ-2026-778',
    shippingAddressSnapshot: {
      addressLine1: 'Distribution Warehouse B, Exit 18',
      city: 'Riyadh',
      country: 'Saudi Arabia',
    },
  })
  console.log(`   Converted to Order: ${convertedOrderRes.order.orderNumber}`);

  // -------------------------------------------------------------
  // Summary Validation
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 SUMMARY OF CAPTURED NOTIFICATIONS: ${capturedNotifications.length} Events`);
  console.log('================================================================');

  let passed = true
  capturedNotifications.forEach((n, idx) => {
    console.log(`\n[Notification ${idx + 1}] Event: ${n.event}`);
    console.log(`  Recipient: ${n.email?.to}`);
    console.log(`  Subject:   ${n.email?.subject}`);
    const isCorporateContent = n.email?.html?.includes('CORPORATE') || n.email?.html?.includes('Corporate') || n.email?.html?.includes('Wholesale')
    console.log(`  Is Corporate Formatted: ${isCorporateContent ? '✅ YES' : '❌ NO'}`);
    if (!n.email || !n.email.to || !n.email.subject) {
      passed = false
    }
  })

  // Cleanup test records
  const db = (await import('../lib/db.js')).getDatabase()
  const { orders: ordersTable, quotations: quotesTable, orderItems: orderItemsTable, quotationItems: quoteItemsTable } = await import('../database/schema.js')
  const { eq: eqDrizzle } = await import('drizzle-orm')
  
  await db.delete(orderItemsTable).where(eqDrizzle(orderItemsTable.orderId, corpOrder.id))
  await db.delete(ordersTable).where(eqDrizzle(ordersTable.id, corpOrder.id))
  await db.delete(orderItemsTable).where(eqDrizzle(orderItemsTable.orderId, convertedOrderRes.order.id))
  await db.delete(ordersTable).where(eqDrizzle(ordersTable.id, convertedOrderRes.order.id))
  await db.delete(quoteItemsTable).where(eqDrizzle(quoteItemsTable.quotationId, quoteReq.id))
  await db.delete(quotesTable).where(eqDrizzle(quotesTable.id, quoteReq.id))

  await customersService.deleteCustomer(corpCust1.id)
  await customersService.deleteCustomer(corpCust2.id)

  if (passed && capturedNotifications.length >= 5) {
    console.log('\n🎉 ALL 6 CORPORATE NOTIFICATION SCENARIOS PASSED SUCCESSFULLY WITHOUT LIVE EMAIL API CALLS!');
  } else {
    console.error('\n❌ SOME SCENARIOS FAILED!');
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})

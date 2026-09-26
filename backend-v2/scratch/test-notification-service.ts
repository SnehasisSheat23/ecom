import { notify, notificationService } from '../src/modules/notifications/index.js'

async function runTest() {
  console.log('🧪 Testing Notification Service (Adapter Factory & Fire-and-Forget Mode)...\n')

  // 1. Order Placed Event
  console.log('Testing ORDER_PLACED notification:')
  notify('ORDER_PLACED', {
    orderNumber: 'ORD-TEST-9901',
    customerName: 'Sheikh Mohammed',
    customerEmail: 'customer@example.com',
    customerPhone: '+971501234567',
    totalAmount: '450.00',
    subtotal: '400.00',
    shippingCost: '25.00',
    currency: 'AED',
    paymentMethod: 'CARD',
    shippingAddress: 'Downtown Dubai, Boulevard Plaza Tower 1',
    items: [
      {
        name: 'Extra Virgin Olive Oil 5L',
        quantity: 2,
        unitPrice: 200,
        totalPrice: 400,
        sku: 'EVOO-5L',
      },
    ],
    trackingUrl: 'https://dubai-ecom.com/orders/track/ORD-TEST-9901',
  })

  // 2. B2B Quotation Requested Event
  console.log('\nTesting B2B_QUOTATION_REQUESTED notification:')
  notify('B2B_QUOTATION_REQUESTED', {
    quoteNumber: 'Q-2026-0042',
    customerName: 'Fatima Al Mansoori',
    customerEmail: 'procurement@almansoori.ae',
    customerPhone: '+971559876543',
    companyName: 'Al Mansoori Hospitality LLC',
    currency: 'AED',
    totalAmount: '12500.00',
    itemsCount: 5,
    customerNotes: 'Need delivery within 5 business days to Jebel Ali warehouse.',
  })

  // 3. Admin Password Reset Event
  console.log('\nTesting ADMIN_PASSWORD_RESET notification:')
  notify('ADMIN_PASSWORD_RESET', {
    email: 'admin@example.com',
    adminName: 'Chief Administrator',
    resetToken: 'rst_991823abf1092',
    resetUrl: 'http://localhost:3000/reset-password?token=rst_991823abf1092',
    expiresInMinutes: 30,
  })

  // Wait a moment for setImmediate fire-and-forget loops to finish logging
  await new Promise((resolve) => setTimeout(resolve, 800))
  console.log('\n✅ All fire-and-forget notification events dispatched smoothly!')
}

runTest().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})

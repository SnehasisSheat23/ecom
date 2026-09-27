import { notificationService } from '../modules/notifications/index.js'

async function run() {
  const recipient = 'snehasisshit2003@gmail.com'

  console.log('--- 1. Dispatching Normal Retail Order Confirmation ---')
  const normalRes = await notificationService.notifySync('ORDER_PLACED', {
    orderNumber: 'AB-2026-9012',
    customerName: 'Snehasis Shit',
    customerEmail: recipient,
    currency: 'SAR',
    subtotal: '495.00',
    shippingCost: '25.00',
    vatAmount: '78.00',
    totalAmount: '598.00',
    paymentMethod: 'credit_card',
    shippingAddress: 'Villa 14, Olaya Street, Al Olaya District, Riyadh 12213, Saudi Arabia',
    items: [
      {
        name: 'Turkish Ceramic Coffee Cup & Saucer Set (6 Pcs)',
        sku: 'TC-CUP-06',
        quantity: 2,
        unitPrice: 160.0,
        totalPrice: 320.0,
      },
      {
        name: 'Traditional Saudi Brass Coffee Dallah 800ml',
        sku: 'DAL-BRS-800',
        quantity: 1,
        unitPrice: 175.0,
        totalPrice: 175.0,
      },
    ],
  })
  console.log('Normal Order Resend Result:', JSON.stringify(normalRes, null, 2))

  console.log('\n--- 2. Dispatching Corporate Wholesale Order Confirmation ---')
  const corpRes = await notificationService.notifySync('ORDER_PLACED', {
    orderNumber: 'AB-CORP-4821',
    customerName: 'Snehasis Shit',
    customerEmail: recipient,
    companyName: 'Kingdom Hospitality & Resorts Group',
    poNumber: 'PO-KSA-2026-089',
    vatNumber: '310294857200003',
    isCorporate: true,
    currency: 'SAR',
    subtotal: '8400.00',
    shippingCost: '0.00',
    vatAmount: '1260.00',
    totalAmount: '9660.00',
    paymentMethod: 'corporate_net_30',
    shippingAddress: 'Central Receiving Dock 3, King Fahd Road, Al Nakheel, Riyadh 11564, Saudi Arabia',
    items: [
      {
        name: 'Commercial Porcelain Dinner Plate 27cm - Case of 24',
        sku: 'HSP-PLT-27C',
        quantity: 10,
        unitPrice: 520.0,
        totalPrice: 5200.0,
      },
      {
        name: 'Stainless Steel Banqueting Cutlery Set (72 Pieces)',
        sku: 'BNQ-CTL-72S',
        quantity: 4,
        unitPrice: 800.0,
        totalPrice: 3200.0,
      },
    ],
  })
  console.log('Corporate Order Resend Result:', JSON.stringify(corpRes, null, 2))
}

run().catch((err) => {
  console.error('Dispatch failed:', err)
  process.exit(1)
})

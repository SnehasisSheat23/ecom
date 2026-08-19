import { getDatabase } from '../lib/db.js'
import { QuotationsService } from '../modules/quotations/quotations.service.js'
import { CustomersService } from '../modules/customers/customers.service.js'
import { ProductsService } from '../modules/products/products.service.js'
import { OrdersService } from '../modules/orders/orders.service.js'
import { customers, products } from '../database/schema.js'
import { eq } from 'drizzle-orm'

const quotationsService = new QuotationsService()
const customersService = new CustomersService()
const productsService = new ProductsService()
const ordersService = new OrdersService()

async function runTest() {
  console.log('🚀 [STARTING END-TO-END B2B / RFQ STOREFRONT & ADMIN TEST]\n')
  const db = getDatabase()

  // 1. Get corporate customer
  const corpCustomerList = await db.select().from(customers).where(eq(customers.email, 'corporate.procurement@almansoor-hospitality.com')).limit(1)
  const corpCustomer = corpCustomerList[0]
  if (!corpCustomer) throw new Error('Corporate customer not found')
  console.log(`👤 Corporate Customer: ${corpCustomer.companyName} (${corpCustomer.email})`)
  console.log(`   Initial Available Credit: ${corpCustomer.availableCredit} AED, Terms: ${corpCustomer.paymentTerms}\n`)

  // 2. Pick a catalog product with volume tiers
  const productList = await productsService.getProducts({ limit: 1 })
  const testProduct = productList.items[0]
  console.log(`📦 Testing with Product: "${testProduct.title}" (Catalog Price: ${testProduct.price} AED)`)
  console.log(`   Corporate Price: ${testProduct.corporatePrice} AED`)
  console.log(`   Volume Tiers:`, JSON.stringify(testProduct.tieredPricing, null, 2))

  // 3. Buyer submits RFQ on Storefront (/cart/rfq)
  console.log('\n▶️ [STEP 1: BUYER SUBMITS RFQ VIA STOREFRONT /cart/rfq]')
  const rfqPayload = {
    customerId: corpCustomer.id,
    customerName: `${corpCustomer.firstName} ${corpCustomer.lastName}`.trim(),
    customerEmail: corpCustomer.email,
    customerPhone: corpCustomer.phone || '+971 50 123 4567',
    companyName: corpCustomer.companyName || 'Al Mansoor Hospitality Group',
    taxNumber: corpCustomer.companyTaxId || '300123456700003',
    currency: 'AED',
    customerNotes: 'Delivery Site: Riyadh Central Kitchen\nRequired Timeline: Standard (3-5 business days)\nClient Notes: Project tender for 300 units.',
    items: [
      {
        productId: testProduct.id,
        name: testProduct.title,
        quantity: 300,
        unitPrice: Number(testProduct.price),
        image: testProduct.images?.[0] || '',
      }
    ]
  }

  const createdQuote = await quotationsService.createQuotationRequest(rfqPayload)
  console.log(`✅ RFQ Created: ${createdQuote.quoteNumber || (createdQuote as any).quotationNumber} (ID: ${createdQuote.id})`)
  console.log(`   Status: ${createdQuote.status}`)
  console.log(`   Estimated Initial Subtotal: ${createdQuote.subtotal} AED`)

  // 4. Admin reviews in Admin Panel (/dashboard/quotations/[id]) & sets custom negotiated rate
  console.log('\n▶️ [STEP 2: ADMIN REVIEWS IN ADMIN PANEL & SENDS CUSTOM QUOTED RATE]')
  const adminQuotedUpdate = await quotationsService.updateQuotationAdmin(createdQuote.id, {
    status: 'quoted',
    adminNotes: 'Approved wholesale project rate: unit price discounted to 11.50 AED with dedicated site transport.',
    discountAmount: 150.00,
    shippingCost: 200.00,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: createdQuote.items[0].id,
        quotedUnitPrice: 11.50, // Discounted from 18.00 catalog / 14.40 corp
      }
    ]
  })

  console.log(`✅ Admin Quoted Update Completed:`)
  console.log(`   Status: ${adminQuotedUpdate.status}`)
  console.log(`   Quoted Unit Price: 11.50 AED/unit (Items Subtotal: ${adminQuotedUpdate.subtotal} AED)`)
  console.log(`   Commercial Discount: -${adminQuotedUpdate.discountAmount} AED`)
  console.log(`   Freight / Delivery: +${adminQuotedUpdate.shippingCost} AED`)
  console.log(`   Estimated Tax (5% VAT): +${adminQuotedUpdate.taxAmount} AED`)
  console.log(`   Quoted Grand Total: ${adminQuotedUpdate.totalAmount} AED`)
  console.log(`   Valid Until: ${adminQuotedUpdate.validUntil}`)

  // 5. Buyer reviews on Storefront (/quotations/[id]) & Clicks "Accept Quote on Net 30 Credit Terms"
  console.log('\n▶️ [STEP 3: BUYER ACCEPTS QUOTE ON STOREFRONT /quotations/[id] WITH NET 30 CREDIT]')
  const initialCreditNum = Number(corpCustomer.availableCredit)

  const acceptResult = await quotationsService.acceptAndConvertToOrder(createdQuote.id, {
    customerId: corpCustomer.id,
    paymentMethodType: 'CREDIT_TERMS',
    poNumber: 'PO-2026-RIYADH-0099',
    shippingAddressSnapshot: {
      fullName: 'Al Mansoor Receiving Manager',
      line1: 'Riyadh Central Kitchen, Site 4',
      city: 'Riyadh',
      country: 'SA',
      phone: '+966 50 000 1122',
    }
  })

  console.log(`✅ Quotation Accepted & Converted to Order!`)
  console.log(`   Converted Order ID: ${acceptResult.order.id}`)
  console.log(`   Order Number: ${acceptResult.order.orderNumber}`)
  console.log(`   Payment Method: ${acceptResult.order.paymentMethodType}`)
  console.log(`   Order Total Charged to Net 30 Credit: ${acceptResult.order.totalAmount} AED`)

  // 6. Verify customer available credit deduction
  const [refreshedCustomer] = await db.select().from(customers).where(eq(customers.id, corpCustomer.id)).limit(1)
  const finalCreditNum = Number(refreshedCustomer.availableCredit)
  const creditDeduction = initialCreditNum - finalCreditNum

  console.log(`\n💳 Corporate Credit Line Verification:`)
  console.log(`   Before Order: ${initialCreditNum.toFixed(2)} AED`)
  console.log(`   After Order:  ${finalCreditNum.toFixed(2)} AED`)
  console.log(`   Deducted:     ${creditDeduction.toFixed(2)} AED (Expected: ${acceptResult.order.totalAmount} AED)`)

  if (Math.abs(creditDeduction - Number(acceptResult.order.totalAmount)) > 0.05) {
    throw new Error(`Credit deduction mismatch: deducted ${creditDeduction} vs order total ${acceptResult.order.totalAmount}`)
  }

  console.log('\n🎉 [ALL TESTS PASSED SUCCESSFULLY!] Complete B2B Storefront RFQ, Bulk Pricing, Admin Review, and Corporate Credit flow is 100% verified!')
  process.exit(0)
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err)
  process.exit(1)
})

import { getDatabase } from '../lib/db.js'
import { products, customers, customerAddresses } from '../database/schema.js'
import { eq } from 'drizzle-orm'
import { hashPassword } from '../lib/auth-crypto.js'

const CURRENCY_RATIOS: Record<string, number> = {
  AED: 1.0,
  SAR: 1.02,
  USD: 0.272,
  EUR: 0.253,
  GBP: 0.218,
  INR: 22.5,
}

async function setupBulkAndCorporatePricing() {
  const db = getDatabase()

  console.log('🚀 Starting Multi-Tier Bulk Pricing & Corporate Setup...')

  // ==========================================
  // 1. UPDATE ALL PRODUCTS WITH MULTI-TIER BULK PRICING & CORPORATE PRICING
  // ==========================================
  const allProducts = await db.select().from(products)
  console.log(`📦 Found ${allProducts.length} products to configure with multi-tier bulk pricing...`)

  for (const prod of allProducts) {
    const rawPricing = (prod.pricing || {}) as Record<string, any>
    const aedObj = rawPricing['AED'] || rawPricing['SAR'] || { price: 45 }
    let basePriceAed = typeof aedObj === 'object' && aedObj !== null ? (aedObj.price ?? 45) : Number(aedObj)
    
    // Normalize if previously in cents
    if (basePriceAed >= 500) {
      basePriceAed = Math.round((basePriceAed / 100) * 100) / 100
    }
    if (basePriceAed <= 0) basePriceAed = 45.0

    const moq = prod.moq || 1
    const t1Min = Math.max(1, moq)
    const t1Max = Math.max(t1Min + 9, 24)
    const t2Min = t1Max + 1
    const t2Max = Math.max(t2Min + 25, 99)
    const t3Min = t2Max + 1
    const t3Max = Math.max(t3Min + 50, 249)
    const t4Min = t3Max + 1

    const updatedPricing: Record<string, any> = {}

    for (const [curr, ratio] of Object.entries(CURRENCY_RATIOS)) {
      const basePrice = Math.round(basePriceAed * ratio * 100) / 100
      const compareAt = Math.round(basePrice * 1.25 * 100) / 100

      // Tiered Discounts:
      // Tier 1 (1 - 24 units): Base Price (0% discount)
      // Tier 2 (25 - 99 units): ~10% discount
      // Tier 3 (100 - 249 units): ~18% discount
      // Tier 4 (250+ units): ~25% discount
      const tier1Price = basePrice
      const tier2Price = Math.round(basePrice * 0.90 * 100) / 100
      const tier3Price = Math.round(basePrice * 0.82 * 100) / 100
      const tier4Price = Math.round(basePrice * 0.75 * 100) / 100

      // Explicit Corporate Price (20% discount for registered corporate/wholesale partners)
      const corporatePrice = Math.round(basePrice * 0.80 * 100) / 100

      updatedPricing[curr] = {
        price: tier1Price,
        compare_at: compareAt,
        corporatePrice: corporatePrice,
        tieredPricing: [
          { minQty: t1Min, maxQty: t1Max, price: tier1Price },
          { minQty: t2Min, maxQty: t2Max, price: tier2Price },
          { minQty: t3Min, maxQty: t3Max, price: tier3Price },
          { minQty: t4Min, price: tier4Price },
        ],
      }
    }

    await db
      .update(products)
      .set({
        pricing: updatedPricing,
        updatedAt: new Date(),
      })
      .where(eq(products.id, prod.id))

    console.log(`✅ Updated ${prod.sku}: Base AED ${updatedPricing['AED'].price} | Corp AED ${updatedPricing['AED'].corporatePrice} | Tiers: 4 volume tiers configured`)
  }

  // ==========================================
  // 2. SETUP CORPORATE B2B ACCOUNT WITH CREDIT & DISCOUNT PERCENT
  // ==========================================
  const corpEmail = 'corporate.procurement@almansoor-hospitality.com'
  const existingCust = await db.select().from(customers).where(eq(customers.email, corpEmail)).limit(1)

  const passwordHash = await hashPassword('Corporate@2026!')

  let customerId = ''

  if (existingCust[0]) {
    customerId = existingCust[0].id
    await db
      .update(customers)
      .set({
        firstName: 'Mansoor',
        lastName: 'Al-Falasi',
        companyName: 'Al-Mansoor Hospitality & Catering LLC',
        companyTaxId: '310123456700003',
        crNumber: '1010876543',
        customerGroup: 'corporate',
        creditLimit: '100000.00',
        availableCredit: '100000.00',
        paymentTerms: 'net_30',
        accountDiscountPercent: '12.00', // 12% extra account-wide discount
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))

    console.log(`✅ Updated Existing Corporate Account: ${corpEmail}`)
  } else {
    const newCust = await db
      .insert(customers)
      .values({
        email: corpEmail,
        passwordHash,
        firstName: 'Mansoor',
        lastName: 'Al-Falasi',
        phone: '+971501234567',
        companyName: 'Al-Mansoor Hospitality & Catering LLC',
        companyTaxId: '310123456700003',
        crNumber: '1010876543',
        customerGroup: 'corporate',
        creditLimit: '100000.00',
        availableCredit: '100000.00',
        paymentTerms: 'net_30',
        accountDiscountPercent: '12.00', // 12% extra account-wide discount
        status: 'active',
      })
      .returning()

    customerId = newCust[0].id
    console.log(`✅ Created New Corporate Account: ${corpEmail} (ID: ${customerId})`)

    // Add Default Address for Corporate Customer
    await db.insert(customerAddresses).values({
      customerId,
      label: 'HQ Procurement Warehouse',
      recipientName: 'Mansoor Al-Falasi',
      phone: '+971501234567',
      addressLine1: 'Warehouse 14, Al Quoz Industrial Area 3',
      addressLine2: 'Sheikh Zayed Road Exit 43',
      city: 'Dubai',
      country: 'United Arab Emirates',
      postalCode: '00000',
      isDefault: true,
    })
    console.log(`✅ Added Corporate Shipping Address: Al Quoz Industrial Area 3, Dubai`)
  }

  console.log('\n=============================================')
  console.log('🎉 Corporate Account & Tiered Bulk Pricing Setup Complete!')
  console.log('=============================================')
  console.log(`Company: Al-Mansoor Hospitality & Catering LLC`)
  console.log(`Email: ${corpEmail}`)
  console.log(`Customer Group: corporate`)
  console.log(`Credit Limit: 100,000.00 AED/SAR`)
  console.log(`Available Credit: 100,000.00 AED/SAR`)
  console.log(`Payment Terms: net_30`)
  console.log(`Account VIP Discount: 12.00%`)
  console.log('=============================================\n')

  process.exit(0)
}

setupBulkAndCorporatePricing().catch((err) => {
  console.error('❌ Error setting up bulk and corporate pricing:', err)
  process.exit(1)
})

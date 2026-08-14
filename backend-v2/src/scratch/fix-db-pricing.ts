import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'
import { eq } from 'drizzle-orm'

// Standard realistic retail multipliers relative to AED base:
const CURRENCY_RATIOS: Record<string, number> = {
  AED: 1.0,
  SAR: 1.02,
  USD: 0.272,
  EUR: 0.253,
  GBP: 0.218,
  INR: 22.5,
}

async function fixAllDatabasePricing() {
  const db = getDatabase()
  const allProducts = await db.select().from(products)

  console.log(`Fixing pricing for ${allProducts.length} products...`)

  for (const prod of allProducts) {
    const rawPricing = (prod.pricing || {}) as Record<string, any>
    const aedRaw = rawPricing['AED']?.price || 2800
    // AED is stored in minor cents (e.g. 2800 is 28.00 AED)
    const baseAedDecimal = aedRaw > 500 ? aedRaw / 100 : aedRaw

    const updatedPricing: Record<string, { price: number; compare_at?: number }> = {}

    for (const curr of ['AED', 'SAR', 'USD', 'EUR', 'GBP', 'INR']) {
      // Calculate realistic market decimal price from base AED decimal
      const decimalPrice = Math.round(baseAedDecimal * CURRENCY_RATIOS[curr] * 100) / 100

      // Store in integer cents (e.g. 5400 INR -> 540000 cents, 7.10 EUR -> 710 cents, 28.00 AED -> 2800 cents)
      const centsPrice = Math.round(decimalPrice * 100)
      const centsCompare = Math.round(centsPrice * 1.2) // 20% higher compare price

      updatedPricing[curr] = {
        price: centsPrice,
        compare_at: centsCompare,
      }
    }

    await db
      .update(products)
      .set({
        pricing: updatedPricing,
        updatedAt: new Date(),
      })
      .where(eq(products.id, prod.id))

    console.log(`Product: ${prod.sku}`)
    console.log(`  AED: ${updatedPricing['AED'].price / 100} AED (${updatedPricing['AED'].price} cents)`)
    console.log(`  EUR: ${updatedPricing['EUR'].price / 100} EUR (${updatedPricing['EUR'].price} cents)`)
    console.log(`  INR: ₹${updatedPricing['INR'].price / 100} INR (${updatedPricing['INR'].price} cents)`)
  }

  console.log('✅ Finished fixing all database prices accurately!')
}

fixAllDatabasePricing().catch(console.error)

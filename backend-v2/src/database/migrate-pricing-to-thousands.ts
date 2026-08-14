import { getDatabase } from '../lib/db.js'
import { products } from './schema.js'
import { eq } from 'drizzle-orm'

async function migratePricingToThousands() {
  console.log('🚀 Starting pricing migration to integer thousands format (x1000)...')
  const db = getDatabase()

  const allProducts = await db.select().from(products)
  console.log(`Found ${allProducts.length} products to inspect and migrate.`)

  let updatedCount = 0

  for (const prod of allProducts) {
    const originalPricing = prod.pricing || {}
    const updatedPricing: Record<string, { price: number; compare_at?: number }> = {}

    let needsUpdate = false

    for (const [curr, pData] of Object.entries(originalPricing as Record<string, any>)) {
      if (!pData) continue

      let priceVal = typeof pData === 'object' ? pData.price : pData
      let compareAtVal = typeof pData === 'object' ? pData.compare_at : undefined

      // If price is standard decimal (e.g. 65.0), convert to integer thousands (65000)
      if (typeof priceVal === 'number' && priceVal > 0 && priceVal < 1000) {
        priceVal = Math.round(priceVal * 1000)
        needsUpdate = true
      } else if (typeof priceVal === 'number') {
        priceVal = Math.round(priceVal)
      }

      if (typeof compareAtVal === 'number' && compareAtVal > 0 && compareAtVal < 1000) {
        compareAtVal = Math.round(compareAtVal * 1000)
        needsUpdate = true
      } else if (typeof compareAtVal === 'number') {
        compareAtVal = Math.round(compareAtVal)
      }

      updatedPricing[curr] = {
        price: priceVal,
        ...(compareAtVal !== undefined ? { compare_at: compareAtVal } : {}),
      }
    }

    if (needsUpdate) {
      await db
        .update(products)
        .set({
          pricing: updatedPricing,
          updatedAt: new Date(),
        })
        .where(eq(products.id, prod.id))

      updatedCount++
      console.log(`✅ Migrated SKU [${prod.sku}]:`, JSON.stringify(updatedPricing))
    } else {
      console.log(`ℹ️ SKU [${prod.sku}] already in thousands format.`)
    }
  }

  console.log(`🎉 Migration complete! Updated ${updatedCount} products to integer thousands format.`)
  process.exit(0)
}

migratePricingToThousands().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})

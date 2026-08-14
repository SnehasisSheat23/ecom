import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'
import { eq } from 'drizzle-orm'

async function migrate() {
  const db = getDatabase()
  const allProds = await db.select().from(products)

  console.log(`Found ${allProds.length} products to check/migrate pricing...`)

  let updatedCount = 0
  for (const prod of allProds) {
    const pricing = prod.pricing || {}
    let needsUpdate = false
    const newPricing: Record<string, { price: number; compare_at?: number }> = {}

    for (const [code, val] of Object.entries(pricing)) {
      if (!val) continue
      let p = val.price ?? 0
      let c = val.compare_at

      // Check if value is in cents (e.g. >= 100 for AED/SAR/USD etc.)
      if (p >= 100) {
        p = Math.round((p / 100) * 100) / 100
        needsUpdate = true
      }
      if (c !== undefined && c >= 100) {
        c = Math.round((c / 100) * 100) / 100
        needsUpdate = true
      }

      newPricing[code] = {
        price: p,
        ...(c !== undefined ? { compare_at: c } : {}),
      }
    }

    if (needsUpdate) {
      await db
        .update(products)
        .set({
          pricing: newPricing,
          updatedAt: new Date(),
        })
        .where(eq(products.id, prod.id))

      console.log(`Updated product [${prod.sku}] pricing:`, JSON.stringify(newPricing))
      updatedCount++
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} products.`)
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

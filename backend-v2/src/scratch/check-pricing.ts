import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'

async function check() {
  const db = getDatabase()
  const list = await db.select().from(products)
  console.log(`Total products: ${list.length}`)
  for (const p of list) {
    console.log(`\nProduct: "${p.translations?.en?.title}" (SKU: ${p.sku})`)
    console.log(`  pricing.AED:`, JSON.stringify(p.pricing?.AED, null, 2))
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})

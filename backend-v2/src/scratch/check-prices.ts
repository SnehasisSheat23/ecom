import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'

async function check() {
  const db = getDatabase()
  const prods = await db.select().from(products)
  for (const p of prods) {
    console.log(p.sku, p.pricing)
  }
}

check().catch(console.error)

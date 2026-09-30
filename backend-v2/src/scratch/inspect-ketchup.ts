import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'
import { ilike } from 'drizzle-orm'

async function checkKetchup() {
  const db = getDatabase()
  const prods = await db.select().from(products).where(ilike(products.sku, '%KETCHUP%'))
  for (const p of prods) {
    console.log('ID:          ', p.id)
    console.log('SKU:         ', p.sku)
    console.log('SEO:         ', JSON.stringify(p.seo))
    console.log('Translations:', JSON.stringify(p.translations, null, 2))
  }
}

checkKetchup().catch(console.error)

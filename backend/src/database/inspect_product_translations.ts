import { getDatabase } from '../lib/db.js'
import { products } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

async function inspectProductTranslations() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  console.log(`Found ${prods.length} products.`)
  for (const p of prods) {
    console.log({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      translations: p.translations,
      specifications: p.specifications
    })
  }
}

inspectProductTranslations().catch(console.error)

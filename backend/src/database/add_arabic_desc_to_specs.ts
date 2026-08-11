import { getDatabase } from '../lib/db.js'
import { products } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

async function addArabicDescriptionToSpecs() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  for (const p of prods) {
    const translations = (p.translations as Record<string, any>) || {}
    const specs = (p.specifications as Record<string, any>) || {}
    const arDesc = translations.ar?.description || ''

    if (arDesc) {
      const newSpecs = {
        ...specs,
        arabicDescription: arDesc,
        descAr: arDesc
      }
      await db.update(products).set({ specifications: newSpecs, updatedAt: new Date() }).where(eq(products.id, p.id))
      console.log(`Added arabicDescription to specs for ${p.title}`)
    }
  }
}

addArabicDescriptionToSpecs().catch(console.error)

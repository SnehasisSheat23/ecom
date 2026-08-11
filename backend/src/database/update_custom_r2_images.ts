import { getDatabase } from '../lib/db.js'
import { products, productImages } from '../modules/catalog/catalog.schema.js'
import { mediaAssets } from '../modules/media/media.schema.js'
import { eq } from 'drizzle-orm'

const R2_DOMAIN = 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev'

const CUSTOM_PRODUCT_R2_MAP: Record<string, string> = {
  'french-fries-straight-cut': `${R2_DOMAIN}/generated/french_fries_belclass_pack_1786346429928.png`,
  'mayonnaise-classic-gallon': `${R2_DOMAIN}/generated/mayonnaise_gallon_pack_1786346476883.png`,
  'pickled-cucumber-sliced': `${R2_DOMAIN}/generated/pickled_cucumber_can_pack_1786346461418.png`,
  'white-vinegar-gallon': `${R2_DOMAIN}/generated/white_vinegar_gallon_pack_1786346444982.png`,
}

async function updateCustomProductRemoteImages() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  for (const p of prods) {
    const customUrl = CUSTOM_PRODUCT_R2_MAP[p.slug]
    if (customUrl) {
      // 1. Update product specifications
      const currentSpecs = (p.specifications as Record<string, string>) || {}
      const newSpecs = { ...currentSpecs, img: customUrl }
      await db.update(products).set({ specifications: newSpecs, updatedAt: new Date() }).where(eq(products.id, p.id))

      // 2. Add media asset
      const [media] = await db.insert(mediaAssets).values({
        tenantId: abTenantId,
        url: customUrl,
        filename: `${p.slug}-custom-pack.png`,
        mimeType: 'image/png',
        sizeBytes: 0,
      }).returning()

      // 3. Add product image link
      await db.insert(productImages).values({
        tenantId: abTenantId,
        productId: p.id,
        mediaId: media.id,
        altText: p.title,
        position: 0,
      })

      console.log(`Updated product ${p.title} (${p.slug}) -> ${customUrl}`)
    }
  }
}

updateCustomProductRemoteImages().catch(console.error)

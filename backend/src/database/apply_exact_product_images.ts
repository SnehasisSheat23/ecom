import { getDatabase } from '../lib/db.js'
import { products, productImages } from '../modules/catalog/catalog.schema.js'
import { mediaAssets } from '../modules/media/media.schema.js'
import { eq } from 'drizzle-orm'

const R2_DOMAIN = 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/generated'

const EXACT_PRODUCT_R2_MAP: Record<string, string> = {
  'tomato-ketchup-portion': `${R2_DOMAIN}/tomato_ketchup_portion_pack_1786346616346.png`,
  'tomato-ketchup-gallon': `${R2_DOMAIN}/tomato_ketchup_gallon_pack_1786346630975.png`,
  'white-vinegar-bottle': `${R2_DOMAIN}/white_vinegar_bottle_pack_1786346650175.png`,
  'white-vinegar-gallon': `${R2_DOMAIN}/white_vinegar_gallon_pack_1786346444982.png`,
  'black-olives-sliced': `${R2_DOMAIN}/black_olives_sliced_pack_1786346666862.png`,
  'black-pepper-powder': `${R2_DOMAIN}/black_pepper_powder_pack_1786346685675.png`,
  'mixed-vegetable-pickles': `${R2_DOMAIN}/mixed_vegetable_pickles_pack_1786346703336.png`,
  'french-fries-straight-cut': `${R2_DOMAIN}/french_fries_belclass_pack_1786346429928.png`,
  'mayonnaise-classic-gallon': `${R2_DOMAIN}/mayonnaise_gallon_pack_1786346476883.png`,
  'pickled-cucumber-sliced': `${R2_DOMAIN}/pickled_cucumber_can_pack_1786346461418.png`,
}

async function applyExactProductImages() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  for (const p of prods) {
    const exactUrl = EXACT_PRODUCT_R2_MAP[p.slug]
    if (exactUrl) {
      // Update specifications.img
      const currentSpecs = (p.specifications as Record<string, string>) || {}
      const newSpecs = { ...currentSpecs, img: exactUrl }
      await db.update(products).set({ specifications: newSpecs, updatedAt: new Date() }).where(eq(products.id, p.id))

      // Clear old product images for this product
      await db.delete(productImages).where(eq(productImages.productId, p.id))

      // Insert fresh media asset and link
      const [media] = await db.insert(mediaAssets).values({
        tenantId: abTenantId,
        url: exactUrl,
        filename: `${p.slug}-exact-pack.png`,
        mimeType: 'image/png',
        sizeBytes: 0,
      }).returning()

      await db.insert(productImages).values({
        tenantId: abTenantId,
        productId: p.id,
        mediaId: media.id,
        altText: p.title,
        position: 0,
      })

      console.log(`Updated exact image for ${p.title} (${p.slug}) -> ${exactUrl}`)
    }
  }
}

applyExactProductImages().catch(console.error)

import { getDatabase } from '../lib/db.js'
import { products, productImages } from '../modules/catalog/catalog.schema.js'
import { mediaAssets } from '../modules/media/media.schema.js'
import { eq } from 'drizzle-orm'

async function syncToMediaAndProductImages() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  
  // Clear old product_images and media_assets for clean insert
  await db.delete(productImages).where(eq(productImages.tenantId, abTenantId))
  await db.delete(mediaAssets).where(eq(mediaAssets.tenantId, abTenantId))
  
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  let mediaCount = 0
  let imgCount = 0

  for (const p of prods) {
    const spec = (p.specifications as Record<string, string>) || {}
    const imgUrl = spec.img
    if (imgUrl) {
      const filename = `${p.slug}-image.png`
      const [media] = await db.insert(mediaAssets).values({
        tenantId: abTenantId,
        url: imgUrl,
        filename,
        mimeType: 'image/png',
        sizeBytes: 0,
      }).returning()
      mediaCount++

      await db.insert(productImages).values({
        tenantId: abTenantId,
        productId: p.id,
        mediaId: media.id,
        altText: p.title,
        position: 0,
      })
      imgCount++
      console.log(`Saved product_image for "${p.title}" -> mediaId: ${media.id}`)
    }
  }
  console.log(`Successfully synced ${mediaCount} media assets and ${imgCount} product_images records to database tables!`)
}

syncToMediaAndProductImages().catch(console.error)

import { getDatabase } from '../lib/db.js'
import { products, productImages } from '../modules/catalog/catalog.schema.js'
import { mediaAssets } from '../modules/media/media.schema.js'
import { eq } from 'drizzle-orm'
import { execSync } from 'child_process'
import path from 'path'

const PUBLIC_IMAGES_DIR = '/Users/snehasisshit/Dubai_ecom/Abdullah-Bakheet/public/images'
const R2_DOMAIN = 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev'

const PRODUCT_IMAGE_FILE_MAP: Record<string, string> = {
  'mayonnaise-classic-gallon': 'b25eb083f82f05ac9fb32dc643d429a29362152d.png',
  'mixed-vegetable-pickles': '9196aa974a546890810c6016161c0beac023dd87.png',
  'cheddar-cheese-sauce': '5ea614e80b1750a6948242606b397619384dd64d.png',
  'black-pepper-powder': 'de981b3923467ebc746f398311365d9cdfa229db.png',
  'tomato-ketchup-portion': '5a06489b13674891cd076609885d8e9807791780.png',
  'tomato-ketchup-squeeze': '5a78966bd8e588d4e65dd42f970c206cab2fdbe8.png',
  'tomato-ketchup-gallon': 'a2693c72ac8332cb5a5d4319c8c8b887edb71e21.png',
  'white-vinegar-bottle': 'f39590362b619e09d7f750ea19f1b4d4358a07d5.png',
  'white-vinegar-gallon': 'ea056b63d0093953138c02fe1d76530bab199c19.png',
  'pickled-cucumber-sliced': '7a6cf875bde1e758b5dfefad9585ab5111043dbf.png',
  'sweet-corn-canned': '53140adbcf2e27d7332f768e35de12328b2adba3.jpg',
  'extra-virgin-olive-oil': 'b35bcfd42719c75ce2155e5f4945742b75bce429.jpg',
  'french-fries-straight-cut': '5a78966bd8e588d4e65dd42f970c206cab2fdbe8.png',
  'black-olives-sliced': '18979ac4b4007afd40906c7aa8534f73c603224e.jpg',
  'barbecue-sauce-bottle': '5ea614e80b1750a6948242606b397619384dd64d.png'
}

async function uploadAllImagesToR2AndUpdateDB() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  
  // Clear old mappings
  await db.delete(productImages).where(eq(productImages.tenantId, abTenantId))
  await db.delete(mediaAssets).where(eq(mediaAssets.tenantId, abTenantId))

  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  for (const p of prods) {
    const localFile = PRODUCT_IMAGE_FILE_MAP[p.slug]
    if (!localFile) continue

    const localFilePath = path.join(PUBLIC_IMAGES_DIR, localFile)
    const r2Key = `products/${p.slug}-${localFile}`

    console.log(`Uploading ${localFile} to remote R2 bucket dubram-assets at ${r2Key}...`)
    try {
      execSync(`npx wrangler r2 object put dubram-assets/${r2Key} --file="${localFilePath}" --remote`, { stdio: 'inherit' })
      const publicR2Url = `${R2_DOMAIN}/${r2Key}`

      // 1. Update specifications.img
      const currentSpecs = (p.specifications as Record<string, string>) || {}
      const newSpecs = { ...currentSpecs, img: publicR2Url }
      await db.update(products).set({ specifications: newSpecs, updatedAt: new Date() }).where(eq(products.id, p.id))

      // 2. Insert into media_assets table
      const [media] = await db.insert(mediaAssets).values({
        tenantId: abTenantId,
        url: publicR2Url,
        filename: `${p.slug}-${localFile}`,
        mimeType: localFile.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
        sizeBytes: 0,
      }).returning()

      // 3. Insert into product_images table
      await db.insert(productImages).values({
        tenantId: abTenantId,
        productId: p.id,
        mediaId: media.id,
        altText: p.title,
        position: 0,
      })

      console.log(`✅ Fully saved and updated "${p.title}" -> Remote R2 URL: ${publicR2Url}`)
    } catch (e) {
      console.error(`Failed to upload or update ${p.slug}:`, e)
    }
  }
  console.log("🎉 Completed uploading all product images to remote Cloudflare R2 and updated database records!")
}

uploadAllImagesToR2AndUpdateDB().catch(console.error)

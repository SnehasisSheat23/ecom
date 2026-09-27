import { getDatabase } from '../lib/db.js'
import { products, categories } from '../database/schema.js'
import { storageService } from '../lib/storage.js'
import { eq } from 'drizzle-orm'

async function migrateImages() {
  console.log('🚀 Starting Migration: Download images from R2 and upload to Supabase Storage (standcore)...')
  const db = getDatabase()

  // 1. Migrate Products
  const allProducts = await db.select().from(products)
  console.log(`📦 Found ${allProducts.length} products to check...`)

  let migratedProductCount = 0
  let migratedImageCount = 0

  for (const prod of allProducts) {
    const rawImages = prod.images || []
    if (!Array.isArray(rawImages) || rawImages.length === 0) continue

    let hasChanges = false
    const newImages: string[] = []

    for (let i = 0; i < rawImages.length; i++) {
      const imgObj = rawImages[i]
      const oldUrl = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.src || '')

      if (!oldUrl || !oldUrl.startsWith('http')) {
        newImages.push(oldUrl)
        continue
      }

      // If already pointing to standcore supabase, skip
      if (oldUrl.includes('supabase.co/storage/v1/object/public/standcore')) {
        newImages.push(oldUrl)
        continue
      }

      try {
        console.log(`⬇️ Downloading product image for [${prod.sku}]: ${oldUrl}`)
        const res = await fetch(oldUrl)
        if (!res.ok) {
          console.warn(`⚠️ Failed to download image ${oldUrl} (Status: ${res.status}). Keeping existing URL.`)
          newImages.push(oldUrl)
          continue
        }

        const buffer = await res.arrayBuffer()
        const contentType = res.headers.get('content-type') || 'image/png'
        
        // Extract filename or create clean name
        const urlParts = oldUrl.split('/')
        const rawFilename = urlParts[urlParts.length - 1]?.split('?')[0] || `product-${prod.sku}-${i}.png`
        const cleanFilename = `${prod.sku.replace(/[^a-zA-Z0-9_-]/g, '_')}-${rawFilename}`

        console.log(`⬆️ Uploading to Supabase [standcore]: ${cleanFilename}...`)
        const newUrl = await storageService.uploadFile(cleanFilename, buffer, contentType)
        console.log(`✅ Uploaded! New URL: ${newUrl}`)

        newImages.push(newUrl)
        hasChanges = true
        migratedImageCount++
      } catch (err) {
        console.error(`❌ Error migrating image ${oldUrl}:`, err)
        newImages.push(oldUrl)
      }
    }

    if (hasChanges) {
      await db
        .update(products)
        .set({
          images: newImages,
          updatedAt: new Date(),
        })
        .where(eq(products.id, prod.id))

      migratedProductCount++
      console.log(`💾 Product [${prod.sku}] updated in DB with new image URLs.`)
    }
  }

  // 2. Migrate Categories
  const allCategories = await db.select().from(categories)
  console.log(`\n📁 Found ${allCategories.length} categories to check...`)
  let migratedCategoryCount = 0

  for (const cat of allCategories) {
    const oldUrl = cat.image
    if (!oldUrl || !oldUrl.startsWith('http') || oldUrl.includes('supabase.co/storage/v1/object/public/standcore')) {
      continue
    }

    try {
      console.log(`⬇️ Downloading category image [${cat.id}]: ${oldUrl}`)
      const res = await fetch(oldUrl)
      if (!res.ok) {
        console.warn(`⚠️ Failed to download category image ${oldUrl} (Status: ${res.status}).`)
        continue
      }

      const buffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/png'
      const cleanFilename = `category-${cat.id}.png`

      console.log(`⬆️ Uploading category image to Supabase [standcore]...`)
      const newUrl = await storageService.uploadFile(cleanFilename, buffer, contentType)
      console.log(`✅ Uploaded category image! New URL: ${newUrl}`)

      await db
        .update(categories)
        .set({
          image: newUrl,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, cat.id))

      migratedCategoryCount++
    } catch (err) {
      console.error(`❌ Error migrating category image ${oldUrl}:`, err)
    }
  }

  console.log('\n=========================================')
  console.log(`🎉 Migration Completed!`)
  console.log(`- Products updated: ${migratedProductCount}`)
  console.log(`- Product images uploaded: ${migratedImageCount}`)
  console.log(`- Categories updated: ${migratedCategoryCount}`)
  console.log('=========================================\n')

  process.exit(0)
}

migrateImages().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

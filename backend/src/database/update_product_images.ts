import { getDatabase } from '../lib/db.js'
import { products } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'mayonnaise-classic-gallon': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/mayonnaise-gallon.png',
  'mixed-vegetable-pickles': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/mixed-pickles.png',
  'cheddar-cheese-sauce': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/cheddar-cheese-sauce.png',
  'black-pepper-powder': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/black-pepper-powder.png',
  'tomato-ketchup-portion': 'https://www.dropbox.com/scl/fi/tmhvpb1857h9n4v5myxw3/1ed8a4787fc118d97bbd66fcda1f1ccdfb113b82-1.png?rlkey=pk43p6i80m5rb06dc1yi3jk0t&st=qvvnx4z3&raw=1',
  'tomato-ketchup-squeeze': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/tomato-ketchup-squeeze.png',
  'tomato-ketchup-gallon': 'https://www.dropbox.com/scl/fi/vveb76ej83cno5x2pg57h/1c35a3fc83b5d3bd6338a52ac7609f4819064413.jpg?rlkey=fbvucajcoeymqkyjnlgv7u7id&st=wzt3d0i4&raw=1',
  'white-vinegar-bottle': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/white-vinegar-bottle.png',
  'white-vinegar-gallon': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/white-vinegar-gallon.png',
  'pickled-cucumber-sliced': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/pickled-cucumber.png',
  'sweet-corn-canned': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/sweet-corn.png',
  'extra-virgin-olive-oil': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/olive-oil.png',
  'french-fries-straight-cut': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/french-fries.png',
  'black-olives-sliced': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/black-olives.png',
  'barbecue-sauce-bottle': 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/barbecue-sauce.png'
}

async function updateProductImages() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  let count = 0
  for (const p of prods) {
    const imageUrl = PRODUCT_IMAGE_MAP[p.slug]
    if (imageUrl) {
      const currentSpecs = (p.specifications as Record<string, string>) || {}
      const newSpecs = { ...currentSpecs, img: imageUrl }
      await db.update(products).set({ specifications: newSpecs, updatedAt: new Date() }).where(eq(products.id, p.id))
      console.log(`Updated [${p.title}] image -> ${imageUrl}`)
      count++
    }
  }
  console.log(`Done! Updated ${count} products.`)
}

updateProductImages().catch(console.error)

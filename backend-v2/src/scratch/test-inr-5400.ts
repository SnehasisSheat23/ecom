import { getDatabase } from '../lib/db.js'
import { ProductsService } from '../modules/products/products.service.js'
import { products } from '../database/schema.js'

async function testSaveInr5400() {
  const db = getDatabase()
  const productsService = new ProductsService()
  const all = await db.select().from(products).limit(1)
  const target = all[0]

  console.log(`Testing with product: ${target.sku} (ID: ${target.id})`)

  // Admin updates prices in clean decimals: AED: 18, EUR: 4.55, INR: 5400
  console.log('Sending PATCH with decimal prices: AED: 18, INR: 5400, currency: "INR"...')
  const updated = await productsService.updateProduct(target.id, {
    currency: 'INR',
    price: 5400,
    pricing: {
      AED: { price: 18, compare_at: 22 },
      EUR: { price: 4.55, compare_at: 5.5 },
      USD: { price: 4.9, compare_at: 6.0 },
      SAR: { price: 18.5, compare_at: 23 },
      GBP: { price: 3.9, compare_at: 4.8 },
      INR: { price: 5400, compare_at: 6000 },
    },
  })

  console.log('API Response for updated product:')
  console.log('  Single price:', updated.price)
  console.log('  Variant prices:', updated.variants[0]?.prices)

  const fetched = await productsService.getProductByIdOrSlug(target.id, 'en', 'INR')
  console.log('Fetched product for currency INR:')
  console.log('  Price:', fetched?.price)
  console.log('  Compare At Price:', fetched?.compareAtPrice)
  console.log('  Variants INR Price:', fetched?.variants[0]?.prices?.find(p => p.currencyCode === 'INR'))

  if (fetched?.price === 5400) {
    console.log('🎉 SUCCESS! INR 5400 is saved and returned exactly as ₹5400.00 without becoming 54!')
  } else {
    console.error('❌ Mismatch:', fetched?.price)
  }
}

testSaveInr5400().catch(console.error)

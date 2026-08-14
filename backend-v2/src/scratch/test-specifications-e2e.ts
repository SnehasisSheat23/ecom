import { ProductsService } from '../modules/products/products.service.js'
import { StorefrontService } from '../modules/storefront/storefront.service.js'
import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'

async function testSpecs() {
  const db = getDatabase()
  const prodService = new ProductsService()
  const storefrontService = new StorefrontService()

  const [first] = await db.select().from(products).limit(1)
  if (!first) {
    console.error('No products found in DB')
    process.exit(1)
  }

  console.log(`Updating specifications for product ${first.sku} (${first.id})...`)
  const updated = await prodService.updateProduct(first.id, {
    specifications: {
      brand: 'Beliva Special',
      netWeight: '24 x 500g (Pouch)',
      origin: 'Saudi Arabia',
      shelfLife: '24 Months',
      mouqFile: 'https://cdn.example.com/spec-sheet.pdf',
    }
  })

  console.log('Admin Product Update Result specs:', updated.specifications)

  console.log('Fetching from Storefront API...')
  const sfProduct = await storefrontService.getProductBySlugOrId(first.id, 'en', 'AED')
  console.log('Storefront Product Result:')
  console.log('  title:', sfProduct?.title)
  console.log('  shortDescription:', sfProduct?.shortDescription)
  console.log('  specifications:', sfProduct?.specifications)

  if (sfProduct?.shortDescription === '24 x 500g (Pouch)') {
    console.log('✅ Specifications test passed successfully!')
  } else {
    console.error('❌ Mismatch in shortDescription!')
  }

  process.exit(0)
}

testSpecs().catch(err => {
  console.error('Error testing specifications:', err)
  process.exit(1)
})

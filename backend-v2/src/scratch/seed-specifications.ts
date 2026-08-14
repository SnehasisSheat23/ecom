import { getDatabase } from '../lib/db.js'
import { products } from '../database/schema.js'
import { eq } from 'drizzle-orm'

async function seedSpecifications() {
  const db = getDatabase()
  const allProds = await db.select().from(products)

  console.log(`Found ${allProds.length} products. Seeding specifications...`)

  const specPresets: Record<string, any> = {
    'ket': {
      brand: 'Abdullah Bakheet',
      brandAr: 'عبدالله باخشب',
      netWeight: '6 x 3.78 L (Gallons)',
      netWeightAr: '٦ × ٣.٧٨ لتر (جالون)',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '12 Months',
      shelfLifeAr: '١٢ شهرًا',
      storage: 'Store in a cool dry place below 25°C',
      storageAr: 'يحفظ في مكان بارد وجاف تحت ٢٥ درجة مئوية',
      certifications: 'Halal Certified, SASO Approved',
      certificationsAr: 'شهادة حلال، معتمد من ساسو',
    },
    'vin': {
      brand: 'Beliva',
      brandAr: 'بيليفا',
      netWeight: '12 x 1 L (Bottles)',
      netWeightAr: '١٢ × ١ لتر (زجاجة)',
      origin: 'Turkey',
      originAr: 'تركيا',
      shelfLife: '24 Months',
      shelfLifeAr: '٢٤ شهرًا',
      storage: 'Keep away from direct sunlight',
      storageAr: 'يحفظ بعيداً عن أشعة الشمس المباشرة',
      certifications: 'ISO 22000, Halal Certified',
      certificationsAr: 'آيزو ٢٢٠٠٠، شهادة حلال',
    },
    'default': {
      brand: 'Abdullah Bakheet',
      brandAr: 'عبدالله باخشب',
      netWeight: '10 x 1 kg (Packs)',
      netWeightAr: '١٠ × ١ كجم',
      origin: 'Saudi Arabia',
      originAr: 'المملكة العربية السعودية',
      shelfLife: '18 Months',
      shelfLifeAr: '١٨ شهرًا',
      storage: 'Store in dry ambient temperature',
      storageAr: 'يحفظ في درجة حرارة الغرفة العادية',
      certifications: 'Halal Certified',
      certificationsAr: 'معتمد حلال',
    }
  }

  for (const p of allProds) {
    const skuLower = p.sku.toLowerCase()
    let spec = specPresets['default']
    if (skuLower.includes('ket') || skuLower.includes('chup')) {
      spec = specPresets['ket']
    } else if (skuLower.includes('vin') || skuLower.includes('bel')) {
      spec = specPresets['vin']
    }

    const currentSpecs = (p.specifications || {}) as Record<string, any>
    const mergedSpecs = { ...spec, ...currentSpecs }

    await db
      .update(products)
      .set({ specifications: mergedSpecs })
      .where(eq(products.id, p.id))

    console.log(`Updated product SKU: ${p.sku} with netWeight: ${mergedSpecs.netWeight}`)
  }

  console.log('Seeding specifications finished successfully!')
  process.exit(0)
}

seedSpecifications().catch(err => {
  console.error('Error seeding specifications:', err)
  process.exit(1)
})

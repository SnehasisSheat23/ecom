import { getDatabase } from '../lib/db.js'
import { products, variants, variantPrices } from '../modules/catalog/catalog.schema.js'
import { eq } from 'drizzle-orm'

const PRODUCT_PRICES: Record<string, number> = {
  'cheddar-cheese-sauce': 780,
  'black-pepper-powder': 450,
  'french-fries-straight-cut': 290,
  'black-olives-sliced': 310,
  'extra-virgin-olive-oil': 850,
  'sweet-corn-canned': 160,
  'mayonnaise-classic-gallon': 650,
  'mixed-vegetable-pickles': 420,
  'pickled-cucumber-sliced': 340,
  'white-vinegar-gallon': 210,
  'white-vinegar-bottle': 95,
  'tomato-ketchup-gallon': 500,
  'tomato-ketchup-squeeze': 120,
  'tomato-ketchup-portion': 180,
}

async function updateDatabaseVariantPrices() {
  const db = getDatabase()
  const abTenantId = 'fd4d2be1-6e2d-48cd-88de-0153ab46bfef'
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenantId))

  for (const p of prods) {
    const targetPrice = PRODUCT_PRICES[p.slug]
    if (targetPrice !== undefined) {
      // 1. Update specifications.price
      const currentSpecs = (p.specifications as Record<string, string>) || {}
      const newSpecs = { ...currentSpecs, price: String(targetPrice) }
      await db.update(products).set({ specifications: newSpecs, updatedAt: new Date() }).where(eq(products.id, p.id))

      // 2. Fetch or create variant
      let [v] = await db.select().from(variants).where(eq(variants.productId, p.id))
      if (!v) {
        [v] = await db.insert(variants).values({
          tenantId: abTenantId,
          productId: p.id,
          sku: `${p.slug}-default`,
          title: 'Default Variant',
          isDefault: true,
          position: 0,
        }).returning()
      }

      // 3. Upsert variantPrices for SAR and INR in minor/major units
      // Note: variant_prices stores price in minor units (cents/halalas) or integer units
      // E.g. SAR 780 stored as 78000 halalas or 780
      const priceInCents = targetPrice * 100

      // Delete old prices for variant
      await db.delete(variantPrices).where(eq(variantPrices.variantId, v.id))

      // Insert SAR and USD/INR prices
      await db.insert(variantPrices).values([
        {
          tenantId: abTenantId,
          variantId: v.id,
          currencyCode: 'SAR',
          price: priceInCents,
        },
        {
          tenantId: abTenantId,
          variantId: v.id,
          currencyCode: 'INR',
          price: priceInCents,
        },
        {
          tenantId: abTenantId,
          variantId: v.id,
          currencyCode: 'USD',
          price: priceInCents,
        }
      ])

      console.log(`Updated DB price for ${p.title} (${p.slug}) -> SAR ${targetPrice} (${priceInCents} cents)`)
    }
  }
  console.log('✅ Successfully updated database variant_prices for all tenant products!')
}

updateDatabaseVariantPrices().catch(console.error)

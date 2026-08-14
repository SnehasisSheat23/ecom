import { getDatabase } from '../lib/db.js'
import { tenants } from '../layers/tenancy/tenancy.schema.js'
import { products, variants, variantPrices } from '../modules/catalog/catalog.schema.js'
import { eq, sql } from 'drizzle-orm'

async function migrate() {
  const db = getDatabase()

  // 1. Get Abdullah Bakheet Tenant
  const allTenants = await db.select().from(tenants)
  const tenant = allTenants.find(
    (t) => t.slug === 'abdullah-bakheet' || t.name.toLowerCase().includes('abdullah')
  )

  if (!tenant) {
    console.error('❌ Tenant abdullah-bakheet not found!')
    process.exit(1)
  }

  console.log(`🚀 Migrating prices for tenant: ${tenant.name} (${tenant.id})...`)

  // 2. Query all products for tenant
  const prodList = await db.select().from(products).where(eq(products.tenantId, tenant.id))
  console.log(`Found ${prodList.length} products.`)

  let updatedCount = 0

  for (const prod of prodList) {
    const specs = (prod.specifications || {}) as Record<string, any>
    const specPriceRaw = specs.price

    // Calculate target price in SAR (numeric e.g. 780)
    let priceSar = 0
    if (specPriceRaw) {
      priceSar = parseFloat(String(specPriceRaw)) || 0
    }

    // Check if variant already exists
    let [variant] = await db
      .select()
      .from(variants)
      .where(sql`${variants.tenantId} = ${tenant.id} AND ${variants.productId} = ${prod.id}`)

    if (!variant) {
      ;[variant] = await db
        .insert(variants)
        .values({
          tenantId: tenant.id,
          productId: prod.id,
          sku: `SKU-${prod.slug}`,
          title: 'Default Variant',
          isDefault: true,
          position: 0,
        })
        .returning()
      console.log(`+ Created variant for product: ${prod.title}`)
    }

    // Insert or update variant_prices row if we have a valid price
    if (priceSar > 0) {
      const priceInMinorUnits = Math.round(priceSar * 100) // e.g. 780 -> 78000

      // Check existing variant price
      const [existingPriceRow] = await db
        .select()
        .from(variantPrices)
        .where(
          sql`${variantPrices.tenantId} = ${tenant.id} AND ${variantPrices.variantId} = ${variant.id} AND ${variantPrices.currencyCode} = 'SAR'`
        )

      if (!existingPriceRow) {
        await db.insert(variantPrices).values({
          tenantId: tenant.id,
          variantId: variant.id,
          currencyCode: 'SAR',
          price: priceInMinorUnits,
        })
        console.log(`+ Inserted variant_price: ${priceSar} SAR for ${prod.title}`)
      } else {
        await db
          .update(variantPrices)
          .set({ price: priceInMinorUnits })
          .where(eq(variantPrices.id, existingPriceRow.id))
        console.log(`~ Updated variant_price: ${priceSar} SAR for ${prod.title}`)
      }
    }

    // Clean up price key from specifications JSON
    if ('price' in specs) {
      const updatedSpecs = { ...specs }
      delete updatedSpecs.price

      await db
        .update(products)
        .set({ specifications: updatedSpecs })
        .where(eq(products.id, prod.id))

      updatedCount++
      console.log(`✓ Removed 'price' from specifications for ${prod.title}`)
    }
  }

  console.log(`✅ Successfully migrated pricing for ${updatedCount} products into variant_prices table!`)
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

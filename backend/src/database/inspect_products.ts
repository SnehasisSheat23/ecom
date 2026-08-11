import { getDatabase } from '../lib/db.js'
import { tenants } from '../layers/tenancy/tenancy.schema.js'
import { products, productImages } from '../modules/catalog/catalog.schema.js'
import { mediaAssets } from '../modules/media/media.schema.js'
import { eq } from 'drizzle-orm'

async function main() {
  const db = getDatabase()
  const allTenants = await db.select().from(tenants)
  console.log('All Tenants:', allTenants.map(t => ({ id: t.id, slug: t.slug, name: t.name })))

  const abTenant = allTenants.find(t => t.slug === 'abdullah-bakheet' || t.name.toLowerCase().includes('abdullah'))
  if (!abTenant) {
    console.log('Tenant abdullah-bakheet not found!')
    return
  }

  console.log(`Found tenant: ${abTenant.name} (${abTenant.id})`)
  const prods = await db.select().from(products).where(eq(products.tenantId, abTenant.id))
  console.log(`Total products for tenant: ${prods.length}`)
  
  for (const p of prods) {
    console.log(`- ID: ${p.id} | Slug: ${p.slug} | Title: ${p.title} | Specs: ${JSON.stringify(p.specifications)}`)
  }
}

main().catch(console.error)

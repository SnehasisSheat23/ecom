import { getPool } from '../lib/db.js'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { tenants } from '../layers/tenancy/tenancy.schema.js'
import { orders, orderItems } from '../modules/orders/orders.schema.js'

async function cleanDb() {
  const pool = getPool()
  const db = drizzle({ client: pool })
  try {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, 'tfcakes'))
    if (tenant) {
      console.log('🧹 Clearing orders for re-import with exact historical timestamps...')
      await db.delete(orderItems).where(eq(orderItems.tenantId, tenant.id))
      await db.delete(orders).where(eq(orders.tenantId, tenant.id))
      console.log('✅ Cleared orders table.')
    }
  } catch (err) {
    console.error(err)
  } finally {
    await pool.end()
  }
}

cleanDb()

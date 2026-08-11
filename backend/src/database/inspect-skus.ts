import pg from 'pg'
const { Pool } = pg

const SOURCE_DB_URL = 'postgresql://postgres.tmhmdyfphbnxbmpttabe:Sneh2326%40250103@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'

async function inspectSkus() {
  const pool = new Pool({ connectionString: SOURCE_DB_URL, ssl: { rejectUnauthorized: false } })
  try {
    const sample = await pool.query(`SELECT "orderId", "CustomerOrderId", email, sku, "totalPrice", "created_at" FROM "Orders" WHERE sku IS NOT NULL LIMIT 5`)
    console.log('Sample Orders SKUs:')
    for (const r of sample.rows) {
      console.log(`\nOrder ${r.orderId} (CustomerOrderId: ${r.CustomerOrderId}, email: ${r.email}):`)
      console.dir(r.sku, { depth: null })
    }
  } catch (err) {
    console.error(err)
  } finally {
    await pool.end()
  }
}

inspectSkus()

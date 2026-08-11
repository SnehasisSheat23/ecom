import pg from 'pg'
const { Pool } = pg

const SOURCE_DB_URL = 'postgresql://postgres.tmhmdyfphbnxbmpttabe:Sneh2326%40250103@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'

async function inspectLegacyOrders() {
  const pool = new Pool({ connectionString: SOURCE_DB_URL, ssl: { rejectUnauthorized: false } })
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)
    console.log('Tables in legacy DB:', res.rows.map(r => r.table_name))

    // Look for order related tables
    const orderTables = res.rows.map(r => r.table_name).filter(t => t.toLowerCase().includes('order'))
    console.log('Order tables:', orderTables)

    for (const table of orderTables) {
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `)
      console.log(`\nColumns in ${table}:`, cols.rows.map(c => `${c.column_name} (${c.data_type})`))

      const count = await pool.query(`SELECT count(*) FROM "${table}"`)
      console.log(`Count in ${table}:`, count.rows[0].count)

      const sample = await pool.query(`SELECT * FROM "${table}" LIMIT 2`)
      console.log(`Sample row from ${table}:`, sample.rows)
    }
  } catch (err) {
    console.error('Error inspecting legacy orders:', err)
  } finally {
    await pool.end()
  }
}

inspectLegacyOrders()

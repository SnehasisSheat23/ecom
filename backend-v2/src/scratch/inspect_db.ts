import { getPool } from '../lib/db.js'

async function inspect() {
  const pool = getPool()
  const cats = await pool.query('SELECT id, parent_id, translations, image FROM v2_categories ORDER BY display_order ASC')
  console.log('=== CATEGORIES (' + cats.rows.length + ') ===')
  for (const c of cats.rows) {
    console.log(`ID: ${c.id} | Parent: ${c.parent_id}`)
    console.log(`  EN:`, c.translations?.en)
    console.log(`  AR:`, c.translations?.ar)
  }

  const prods = await pool.query('SELECT id, sku, translations, category_id, moq, moq_step, pricing, stock_quantity FROM v2_products')
  console.log('\n=== PRODUCTS (' + prods.rows.length + ') ===')
  for (const p of prods.rows) {
    console.log(`SKU: ${p.sku} | Cat: ${p.category_id} | MOQ: ${p.moq}`)
    console.log(`  EN Title:`, p.translations?.en?.title)
    console.log(`  EN Desc:`, p.translations?.en?.description)
    console.log(`  AR Title:`, p.translations?.ar?.title)
    console.log(`  AR Desc:`, p.translations?.ar?.description)
    console.log('---')
  }
  process.exit(0)
}

inspect().catch(err => {
  console.error(err)
  process.exit(1)
})

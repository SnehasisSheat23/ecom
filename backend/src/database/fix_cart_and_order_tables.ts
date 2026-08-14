import { getPool } from '../lib/db.js'

async function runFixes() {
  const pool = getPool()
  console.log('🔧 Running database schema patches for cart_items and order_items...')

  try {
    // 1. Add missing partner_id column to cart_items if not present
    await pool.query(`
      ALTER TABLE cart_items 
      ADD COLUMN IF NOT EXISTS partner_id UUID;
    `)
    console.log('✅ Added partner_id column to cart_items table')

    // 2. Alter order_items image_url_snapshot to TEXT so presigned URLs are never truncated
    await pool.query(`
      ALTER TABLE order_items 
      ALTER COLUMN image_url_snapshot TYPE TEXT;
    `)
    console.log('✅ Changed image_url_snapshot in order_items to TEXT')

    // 3. Alter products / cart_items imageUrl snapshots to TEXT if applicable
    await pool.query(`
      ALTER TABLE orders 
      ALTER COLUMN tracking_url TYPE TEXT;
    `)
    console.log('✅ Changed tracking_url in orders to TEXT')

    console.log('🚀 Database schema patches applied successfully!')
  } catch (err) {
    console.error('❌ Database schema patch failed:', err)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

runFixes()

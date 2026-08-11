import { getPool } from '../lib/db.js'

async function fix() {
  const pool = getPool()
  try {
    console.log('🔄 Swapping custom domains to route localhost to Trugift...')
    
    // Set Snehasis Store to a different hostname
    await pool.query(
      "UPDATE tenants SET custom_domain = 'snehasis.localhost' WHERE id = '811de35a-9603-4153-af42-270120c2e7ca'"
    )
    
    // Set Trugift to localhost
    await pool.query(
      "UPDATE tenants SET custom_domain = 'localhost' WHERE id = '47b8da76-e8ba-4e1d-8320-a4fdc19ea4f9'"
    )

    console.log('✅ Custom domains updated successfully!')
  } catch (error) {
    console.error('❌ Update failed:', error)
  } finally {
    await pool.end()
  }
}

fix()

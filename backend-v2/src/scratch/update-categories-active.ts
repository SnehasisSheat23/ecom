import { getPool } from '../lib/db.js'

async function migrateAndMakeAllCategoriesActive() {
  console.log('Running migration to ensure status column exists and all categories are ACTIVE...')
  const pool = getPool()

  try {
    // 1. Add status column if not exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='v2_categories' AND column_name='status'
        ) THEN
          ALTER TABLE v2_categories ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
        END IF;
      END $$;
    `)

    // 2. Set all categories to 'active'
    const result = await pool.query(`UPDATE v2_categories SET status = 'active';`)
    console.log(`✅ Successfully updated ${result.rowCount ?? 0} categories in database to status = 'active'!`)
  } catch (err) {
    console.error('❌ Migration failed:', err)
  } finally {
    await pool.end()
  }
}

migrateAndMakeAllCategoriesActive()

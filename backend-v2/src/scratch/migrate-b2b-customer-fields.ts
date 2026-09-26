import { getPool } from '../lib/db.js'

async function migrate() {
  const pool = getPool()
  console.log('🔄 Migrating v2_customers table for B2B Registration fields...')
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='v2_customers' AND column_name='business_type') THEN
        ALTER TABLE v2_customers ADD COLUMN business_type VARCHAR(100);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='v2_customers' AND column_name='city') THEN
        ALTER TABLE v2_customers ADD COLUMN city VARCHAR(100);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='v2_customers' AND column_name='delivery_address') THEN
        ALTER TABLE v2_customers ADD COLUMN delivery_address TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='v2_customers' AND column_name='cr_document_url') THEN
        ALTER TABLE v2_customers ADD COLUMN cr_document_url VARCHAR(500);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='v2_customers' AND column_name='vat_document_url') THEN
        ALTER TABLE v2_customers ADD COLUMN vat_document_url VARCHAR(500);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='v2_customers' AND column_name='rejection_reason') THEN
        ALTER TABLE v2_customers ADD COLUMN rejection_reason TEXT;
      END IF;
    END $$;
  `)

  console.log('✅ Successfully added B2B registration columns to v2_customers table!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

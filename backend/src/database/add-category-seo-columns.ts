import pg from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.dddhoqidmqwcszerntsu:Sneh2326%40250103@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'

async function run() {
  console.log('Adding SEO columns to categories table on DATABASE_URL:', DATABASE_URL)
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  await client.query(`
    ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS meta_description VARCHAR(500),
      ADD COLUMN IF NOT EXISTS h1 VARCHAR(255),
      ADD COLUMN IF NOT EXISTS h2 TEXT,
      ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;
  `)

  console.log('Successfully added meta_title, meta_description, h1, h2, and keywords columns to OpenShutter categories table!')
  await client.end()
}

run().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})

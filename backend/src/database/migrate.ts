import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPool } from '../lib/db.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(currentDir, 'migrations')

export const runMigrations = async (): Promise<void> => {
  const pool = getPool()
  
  // 1. Create migration tracking table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "id" serial PRIMARY KEY,
      "name" varchar(255) UNIQUE NOT NULL,
      "applied_at" timestamp DEFAULT now()
    );
  `)

  // Check if target database already has legacy tables (e.g. created before tracking table was introduced)
  const { rows: tableCheck } = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tenants'
  `)
  const isLegacyDb = tableCheck.length > 0

  // 2. Get already applied migrations
  let { rows } = await pool.query('SELECT name FROM "_migrations"')
  
  // If this is the first time we're using tracking on a legacy database, mark old migrations as applied
  if (rows.length === 0 && isLegacyDb) {
    const existingFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()
    for (const file of existingFiles) {
      if (file < '0027_catalog_type.sql') {
        process.stdout.write(`Seeding ${file} as already applied...\n`)
        await pool.query('INSERT INTO "_migrations" (name) VALUES ($1) ON CONFLICT DO NOTHING', [file])
      }
    }
    const refetch = await pool.query('SELECT name FROM "_migrations"')
    rows = refetch.rows
  } else if (!isLegacyDb) {
    // Fresh database: ensure we don't have false entries in _migrations if a previous run was aborted
    const { rows: tableCount } = await pool.query(`
      SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name != '_migrations'
    `)
    if (parseInt(tableCount[0].count, 10) === 0) {
      await pool.query('TRUNCATE TABLE "_migrations"')
      rows = []
    }
  }

  const applied = new Set(rows.map(r => r.name))

  // 3. Get all migration files
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()

  // 4. Apply only new migrations
  for (const file of files) {
    if (applied.has(file)) {
      process.stdout.write(`Skipping ${file} (already applied)\n`)
      continue
    }

    process.stdout.write(`Applying ${file}...\n`)
    const sql = await readFile(path.join(migrationsDir, file), 'utf8')
    
    // We run the migration in a transaction to be safe
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO "_migrations" (name) VALUES ($1)', [file])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isDirectRun) {
  runMigrations()
    .then(() => {
      process.stdout.write('Migrations applied successfully\n')
      process.exit(0)
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exit(1)
    })
}

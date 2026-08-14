import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'

const { Pool } = pg

let pool: pg.Pool | null = null
let db: NodePgDatabase<any> | null = null

export const getDatabase = (): NodePgDatabase<any> => {
  if (db) return db

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const ssl = connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined
  pool = new Pool({ connectionString, max: 10, ssl })
  db = drizzle({ client: pool })
  return db
}

export const getPool = (): pg.Pool => {
  if (!pool) {
    getDatabase()
  }
  return pool!
}

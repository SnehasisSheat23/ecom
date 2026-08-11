import pg from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { getOptionalEnv } from './env.js'

const { Pool } = pg

export type Database = NodePgDatabase<Record<string, never>>

const required = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

let pool: pg.Pool | null = null
let db: Database | null = null

export const getDatabase = (databaseUrl = getOptionalEnv('DATABASE_URL')): Database => {
  const connectionString = required(databaseUrl, 'DATABASE_URL')

  if (db) return db

  const ssl = connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined
  pool = new Pool({ connectionString, max: 10, ssl })
  db = drizzle({ client: pool })
  return db
}

export const getPool = (databaseUrl = getOptionalEnv('DATABASE_URL')): pg.Pool => {
  const connectionString = required(databaseUrl, 'DATABASE_URL')
  if (!pool) {
    getDatabase(connectionString)
  }
  return pool!
}
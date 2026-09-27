import { auth } from '../lib/better-auth.js'
import { getDatabase } from '../lib/db.js'
import { customers, betterSessions } from '../database/schema.js'
import { eq } from 'drizzle-orm'

async function main() {
  const db = getDatabase()
  const allUsers = await db.select().from(customers)
  console.log('Total customers in DB:', allUsers.length)
  for (const u of allUsers) {
    console.log(`- ${u.email} | role=${u.role} | group=${u.customerGroup} | status=${u.status}`)
  }

  const sessions = await db.select().from(betterSessions)
  console.log('Total active sessions in DB:', sessions.length)
  for (const s of sessions) {
    console.log(`- session token=${s.token.substring(0, 10)}... | userId=${s.userId} | expiresAt=${s.expiresAt}`)
  }
}

main().catch(console.error)

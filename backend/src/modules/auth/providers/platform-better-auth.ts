import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDatabase } from '../../../lib/db.js'
import { users, userRoles } from '../../users/users.schema.js'
import { userSessions } from '../auth.schema.js'

export const createPlatformAuthInstance = (env: Record<string, string>) => {
  const db = getDatabase(env.DATABASE_URL)

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: users,
        session: userSessions,
        userRole: userRoles,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    secret: env.APP_SECRET || 'development-secret-key-change-in-production',
    baseURL: env.API_BASE_URL || 'http://localhost:3000',
  })
}

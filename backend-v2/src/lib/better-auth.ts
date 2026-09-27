import { betterAuth } from 'better-auth'
import { bearer } from 'better-auth/plugins'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDatabase } from './db.js'
import * as schema from '../database/schema.js'
import { notify } from '../modules/notifications/index.js'

export const getBetterAuth = () => {
  const db = getDatabase()

  return betterAuth({
    basePath: '/api/v1/auth',
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 8787}`,
    secret: process.env.BETTER_AUTH_SECRET || process.env.APP_SECRET || 'dubai-ecom-better-auth-secret-key-2026',
    trustedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
      'https://abdullahbakheetksa.com',
      'https://www.abdullahbakheetksa.com',
      'https://api.abdullahbakheetksa.com',
      'https://admin.abdullahbakheetksa.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:8787',
      'http://127.0.0.1:8787',
    ],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        v2_customers: schema.customers,
        v2_better_sessions: schema.betterSessions,
        v2_better_accounts: schema.betterAccounts,
        v2_better_verifications: schema.betterVerifications,
      },
    }),
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },


    user: {
      modelName: 'v2_customers',
      fields: {
        name: 'name',
        email: 'email',
        emailVerified: 'emailVerified',
        image: 'image',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
      additionalFields: {
        role: { type: 'string', defaultValue: 'customer' },
        firstName: { type: 'string', required: false },
        lastName: { type: 'string', required: false },
        phone: { type: 'string', required: false },
        companyName: { type: 'string', required: false },
        companyTaxId: { type: 'string', required: false },
        crNumber: { type: 'string', required: false },
        businessType: { type: 'string', required: false },
        city: { type: 'string', required: false },
        deliveryAddress: { type: 'string', required: false },
        crDocumentUrl: { type: 'string', required: false },
        vatDocumentUrl: { type: 'string', required: false },
        customerGroup: { type: 'string', defaultValue: 'retail' },
        status: { type: 'string', defaultValue: 'active' },
      },
    },
    session: {
      modelName: 'v2_better_sessions',
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    account: {
      modelName: 'v2_better_accounts',
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
        requireLocalEmailVerified: false,
        updateUserInfoOnLink: true,
      },
    },
    verification: {
      modelName: 'v2_better_verifications',
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url, token }) => {
        try {
          await notify('ADMIN_PASSWORD_RESET', {
            email: user.email,
            adminName: user.name || user.email.split('@')[0],
            resetToken: token,
            resetUrl: url,
            expiresInMinutes: 60,
          })
        } catch (err) {
          console.error('Failed to dispatch password reset notification:', err)
        }
      },
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id.apps.googleusercontent.com',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
        accessType: 'offline',
        prompt: 'select_account',
      },
    },
    plugins: [bearer()],
    databaseHooks: {
      user: {
        create: {
          before: async (user: any) => {
            const rawName = user.name || user.firstName || ''
            const parts = rawName.trim().split(/\s+/)
            const firstName = parts[0] || ''
            const lastName = parts.slice(1).join(' ') || ''

            return {
              data: {
                ...user,
                name: rawName || (firstName ? `${firstName} ${lastName}`.trim() : user.email?.split('@')[0]),
                firstName: user.firstName || firstName,
                lastName: user.lastName || lastName,
                role: user.role || 'customer',
                customerGroup: user.customerGroup || 'retail',
                status: user.status || 'active',
                emailVerified: true,
              },
            }
          },
        },
      },
    },
  })
}

let _betterAuthInstance: ReturnType<typeof getBetterAuth> | null = null

export const auth = (() => {
  if (!_betterAuthInstance) {
    _betterAuthInstance = getBetterAuth()
  }
  return _betterAuthInstance
})()

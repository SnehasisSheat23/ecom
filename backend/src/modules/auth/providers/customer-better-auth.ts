import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, phoneNumber } from 'better-auth/plugins'
import { getDatabase } from '../../../lib/db.js'
import { customers } from '../../customers/customers.schema.js'
import { customerSessions } from '../auth.schema.js'

export interface CustomerAuthOptions {
  enableGoogleOAuth?: boolean
  enableMagicLink?: boolean
  enablePhoneOtp?: boolean
}

export const createCustomerAuthInstance = (
  env: Record<string, string>,
  options: CustomerAuthOptions = {},
) => {
  const db = getDatabase(env.DATABASE_URL)

  const plugins: any[] = []

  if (options.enableMagicLink) {
    plugins.push(
      magicLink({
        sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
          // Hook for Cloudflare Email / Resend provider
        },
      }),
    )
  }

  if (options.enablePhoneOtp) {
    plugins.push(
      phoneNumber({
        sendOTP: async ({ phoneNumber, code }: { phoneNumber: string; code: string }) => {
          // Hook for Twilio / SMS provider
        },
      }),
    )
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: customers,
        session: customerSessions,
      },
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: options.enableGoogleOAuth
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID || '',
            clientSecret: env.GOOGLE_CLIENT_SECRET || '',
          },
        }
      : undefined,
    plugins,
    secret: env.APP_SECRET || 'development-secret-key-change-in-production',
    baseURL: env.API_BASE_URL || 'http://localhost:3000',
  })
}

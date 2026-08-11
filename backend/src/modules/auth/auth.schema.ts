import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { users } from '../users/users.schema.js'
import { customers } from '../customers/customers.schema.js'

export const tenantAuthConfig = pgTable('tenant_auth_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id)
    .unique(),
  enableEmailPassword: boolean('enable_email_password').notNull().default(true),
  enablePhoneOtp: boolean('enable_phone_otp').notNull().default(false),
  enableGoogleOAuth: boolean('enable_google_oauth').notNull().default(false),
  enableMagicLink: boolean('enable_magic_link').notNull().default(false),
  primaryIdentifier: varchar('primary_identifier', { length: 20 })
    .$type<'email' | 'phone'>()
    .notNull()
    .default('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const customerSessions = pgTable('customer_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

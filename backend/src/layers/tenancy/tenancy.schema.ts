import {
  bigint,
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { BusinessType, TenantFullConfig } from './tenancy.types.js'
import { DEFAULT_FULL_CONFIG } from './tenancy.types.js'

export const tenantModeEnum = pgEnum('tenant_mode', ['SINGLE_VENDOR', 'MULTI_VENDOR'])
export const tenantStatusEnum = pgEnum('tenant_status', ['onboarding', 'active', 'suspended'])
export const shippingStrategyEnum = pgEnum('shipping_strategy', ['flat_rate', 'weight_based', 'vendor_managed', 'carrier_api'])

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  customDomain: varchar('custom_domain', { length: 255 }).unique(),
  mode: tenantModeEnum('mode').notNull().default('SINGLE_VENDOR'),
  status: tenantStatusEnum('status').notNull().default('onboarding'),
  businessType: varchar('business_type', { length: 50 }).$type<BusinessType>().notNull().default('ECOMMERCE'),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
  fullConfig: jsonb('full_config')
    .$type<TenantFullConfig>()
    .notNull()
    .default(DEFAULT_FULL_CONFIG),
  features: jsonb('features')
    .$type<{
      wishlist: boolean
      loyalty: boolean
      reviews: boolean
      cart_abandonment: boolean
    }>()
    .notNull()
    .default({
      wishlist: false,
      loyalty: false,
      reviews: false,
      cart_abandonment: false,
    }),
  branding: jsonb('branding')
    .$type<{
      primary_color: string
      secondary_color: string
      logo_url: string | null
      favicon_url: string | null
      font: string
    }>()
    .notNull()
    .default({
      primary_color: '#000000',
      secondary_color: '#ffffff',
      logo_url: null,
      favicon_url: null,
      font: 'Inter',
    }),
  notificationConfig: jsonb('notification_config')
    .$type<{
      from_name: string
      from_email: string
    }>()
    .notNull()
    .default({
      from_name: 'Store',
      from_email: 'noreply@nexuscommerce.app',
    }),
  taxConfig: jsonb('tax_config'),
  payoutConfig: jsonb('payout_config'),
  billingPlanId: uuid('billing_plan_id'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tenantConfig = pgTable('tenant_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id)
    .unique(),
  shippingFlatRate: integer('shipping_flat_rate').notNull().default(4900),
  freeShippingThreshold: integer('free_shipping_threshold'),
  shippingStrategy: shippingStrategyEnum('shipping_strategy').notNull().default('flat_rate'),
  earnRate: decimal('earn_rate', { precision: 5, scale: 2 }).notNull().default('1.00'),
  redeemRate: decimal('redeem_rate', { precision: 5, scale: 2 }).notNull().default('100.00'),
  cartAbandonmentDelayHours: integer('cart_abandonment_delay_hours').notNull().default(2),
  couponLoyaltyStacking: boolean('coupon_loyalty_stacking').notNull().default(false),
  returnWindowDays: integer('return_window_days').notNull().default(7),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tenantStats = pgTable('tenant_stats', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id),
  totalRevenue: bigint('total_revenue', { mode: 'number' }).notNull().default(0),
  totalOrders: integer('total_orders').notNull().default(0),
  totalCommission: bigint('total_commission', { mode: 'number' }).notNull().default(0),
  totalVendors: integer('total_vendors').notNull().default(0),
  totalCustomers: integer('total_customers').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tenantPaymentConfig = pgTable('tenant_payment_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id)
    .unique(),
  provider: varchar('provider', { length: 50 }).notNull().default('razorpay'),
  credentials: text('credentials').notNull(),
  webhookSecret: varchar('webhook_secret', { length: 255 }).notNull(),
  isTestMode: boolean('is_test_mode').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

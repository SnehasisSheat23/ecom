import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { customers } from '../customers/customers.schema.js'

export const checkouts = pgTable(
  'checkouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    customerId: uuid('customer_id').references(() => customers.id),
    guestEmail: varchar('guest_email', { length: 255 }),
    status: varchar('status', { length: 30 })
      .$type<'CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_FAILED' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED'>()
      .notNull()
      .default('CREATED'),
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, unknown>>(),
    billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, unknown>>(),
    shippingMethodSnapshot: jsonb('shipping_method_snapshot').$type<Record<string, unknown>>(),
    couponCodeSnapshot: varchar('coupon_code_snapshot', { length: 100 }),
    discountAmount: integer('discount_amount').notNull().default(0),
    shippingAmount: integer('shipping_amount').notNull().default(0),
    taxAmount: integer('tax_amount').notNull().default(0),
    subtotal: integer('subtotal').notNull().default(0),
    total: integer('total').notNull().default(0),
    paymentMethod: varchar('payment_method', { length: 50 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_checkouts_tenant_customer').on(table.tenantId, table.customerId),
    index('idx_checkouts_tenant_status').on(table.tenantId, table.status),
  ],
)

export const checkoutGroups = pgTable(
  'checkout_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    checkoutId: uuid('checkout_id').notNull().references(() => checkouts.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id),
    guestEmail: varchar('guest_email', { length: 255 }),
    paymentIntentId: uuid('payment_intent_id'),
    orderCount: integer('order_count').notNull().default(1),
    totalAmount: integer('total_amount').notNull().default(0),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    status: varchar('status', { length: 30 })
      .$type<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'>()
      .notNull()
      .default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_checkout_groups_tenant_checkout').on(table.tenantId, table.checkoutId),
    index('idx_checkout_groups_tenant_customer').on(table.tenantId, table.customerId),
  ],
)

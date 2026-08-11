import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  uniqueIndex,
  index,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { customers, guestSessions } from '../customers/customers.schema.js'
import { productTypeEnum, variants } from '../catalog/catalog.schema.js'

export const cartStatusEnum = pgEnum('cart_status', ['active', 'expired', 'converted'])

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    customerId: uuid('customer_id').references(() => customers.id),
    guestSessionId: uuid('guest_session_id').references(() => guestSessions.id),
    couponCode: varchar('coupon_code', { length: 100 }),
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    status: cartStatusEnum('status').notNull().default('active'),
    selectedShippingOptionId: varchar('selected_shipping_option_id', { length: 100 }),
    subtotal: integer('subtotal').notNull().default(0),
    shippingAmount: integer('shipping_amount').notNull().default(0),
    discountAmount: integer('discount_amount').notNull().default(0),
    total: integer('total').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_carts_customer').on(table.tenantId, table.customerId, table.status),
    index('idx_carts_guest').on(table.tenantId, table.guestSessionId, table.status),
  ],
)

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    partnerId: uuid('partner_id'),
    productType: productTypeEnum('product_type').notNull(),
    productTitleSnapshot: varchar('product_title_snapshot', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: integer('unit_price').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    lineTotal: integer('line_total').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cart_items_cart').on(table.cartId),
    uniqueIndex('uq_cart_items_cart_variant').on(table.cartId, table.variantId),
  ],
)

/**
 * NOTE: This table is defined but has no repository, service, or route implementation.
 * It is reserved for Phase 2 "Save for Later" feature. Do not reference it until implemented.
 */
export const savedForLaterItems = pgTable(
  'saved_for_later_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    customerId: uuid('customer_id').notNull().references(() => customers.id),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_saved_for_later_customer').on(table.tenantId, table.customerId)],
)

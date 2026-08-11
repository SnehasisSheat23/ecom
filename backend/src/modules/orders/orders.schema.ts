import { boolean, index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { partners } from '../partner/partner.schema.js'
import { customers } from '../customers/customers.schema.js'
import { products, variants } from '../catalog/catalog.schema.js'

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').notNull().references(() => partners.id),
    customerId: uuid('customer_id').references(() => customers.id),
    checkoutGroupId: uuid('checkout_group_id').notNull(),
    orderNumber: varchar('order_number', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).$type<
      'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
    >().notNull().default('PENDING'),
    payoutStatus: varchar('payout_status', { length: 20 }).notNull().default('PENDING'),
    trackingNumber: varchar('tracking_number', { length: 100 }),
    trackingUrl: varchar('tracking_url', { length: 500 }),
    guestEmail: varchar('guest_email', { length: 255 }),
    orderToken: uuid('order_token').notNull().defaultRandom(),
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').$type<Record<string, unknown>>().notNull(),
    billingAddressSnapshot: jsonb('billing_address_snapshot').$type<Record<string, unknown>>(),
    shippingMethodSnapshot: jsonb('shipping_method_snapshot').$type<Record<string, unknown>>(),
    subtotal: integer('subtotal').notNull(),
    discountAmount: integer('discount_amount').notNull().default(0),
    shippingAmount: integer('shipping_amount').notNull().default(0),
    taxAmount: integer('tax_amount').notNull().default(0),
    total: integer('total').notNull(),
    couponCodeSnapshot: varchar('coupon_code_snapshot', { length: 100 }),
    loyaltyPointsRedeemed: integer('loyalty_points_redeemed').notNull().default(0),
    notes: varchar('notes', { length: 500 }),
    idempotencyKey: varchar('idempotency_key', { length: 150 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_order_number_tenant').on(table.tenantId, table.orderNumber),
    uniqueIndex('uq_order_idempotency_tenant').on(table.tenantId, table.idempotencyKey),
    index('idx_orders_tenant_vendor').on(table.tenantId, table.partnerId),
    index('idx_orders_checkout_group').on(table.tenantId, table.checkoutGroupId),
    index('idx_orders_tenant_customer').on(table.tenantId, table.customerId),
    index('idx_orders_tenant_created').on(table.tenantId, table.createdAt),
    index('idx_orders_token').on(table.orderToken),
    index('idx_orders_tenant_status_created').on(table.tenantId, table.status, table.createdAt),
    index('idx_orders_tenant_customer_email').on(table.tenantId, table.guestEmail),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    partnerId: uuid('partner_id'),
    productTitleSnapshot: varchar('product_title_snapshot', { length: 255 }).notNull(),
    variantTitleSnapshot: varchar('variant_title_snapshot', { length: 255 }).notNull(),
    skuSnapshot: varchar('sku_snapshot', { length: 100 }).notNull(),
    unitPriceSnapshot: integer('unit_price_snapshot').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
    imageUrlSnapshot: varchar('image_url_snapshot', { length: 500 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    returnStatus: varchar('return_status', { length: 20 }).$type<
      'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED'
    >().notNull().default('NONE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_order_items_order').on(table.orderId),
    index('idx_order_items_tenant_vendor').on(table.tenantId, table.partnerId),
  ],
)

export const orderSequences = pgTable('order_sequences', {
  tenantId: uuid('tenant_id').primaryKey().references(() => tenants.id),
  nextValue: integer('next_value').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const paymentIntents = pgTable(
  'payment_intents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    status: varchar('status', { length: 30 }).$type<
      'PENDING' | 'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
    >().notNull().default('PENDING'),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    provider: varchar('provider', { length: 30 }),
    providerOrderId: varchar('provider_order_id', { length: 255 }),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_payment_intents_order').on(table.tenantId, table.orderId)],
)

export const shipments = pgTable(
  'shipments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    orderId: uuid('order_id').references(() => orders.id),
    provider: varchar('provider', { length: 50 }).notNull(),
    carrierId: varchar('carrier_id', { length: 150 }),
    awbNumber: varchar('awb_number', { length: 100 }),
    shippingStatus: varchar('shipping_status', { length: 50 }).notNull().default('PENDING'),
    labelUrl: varchar('label_url', { length: 500 }),
    invoiceUrl: varchar('invoice_url', { length: 500 }),
    trackingUrl: varchar('tracking_url', { length: 500 }),
    syncEnabled: boolean('sync_enabled').notNull().default(true),
    rawResponse: jsonb('raw_response').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_shipments_tenant_order').on(table.tenantId, table.orderId),
  ],
)

export const shipmentTrackingLogs = pgTable(
  'shipment_tracking_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    shipmentId: uuid('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull(),
    description: varchar('description', { length: 500 }),
    location: varchar('location', { length: 255 }),
    eventTime: timestamp('event_time', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_shipment_tracking_logs_shipment').on(table.shipmentId, table.eventTime),
  ],
)

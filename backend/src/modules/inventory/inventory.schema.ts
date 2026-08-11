import { index, integer, pgTable, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { partners } from '../partner/partner.schema.js'
import { variants } from '../catalog/catalog.schema.js'

export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').notNull().references(() => partners.id),
    // TODO: When implementing multi-location inventory, replace .unique() with a
    // composite uniqueIndex('uq_inventory_tenant_variant_location').on(table.tenantId, table.variantId, table.locationId)
    variantId: uuid('variant_id').notNull().references(() => variants.id).unique(),
    quantityAvailable: integer('quantity_available').notNull().default(0),
    quantityReserved: integer('quantity_reserved').notNull().default(0),
    quantitySold: integer('quantity_sold').notNull().default(0),
    allowBackorder: boolean('allow_backorder').notNull().default(false),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    locationId: uuid('location_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_inventory_variant').on(table.variantId),
    index('idx_inventory_tenant').on(table.tenantId),
    index('idx_inventory_tenant_vendor').on(table.tenantId, table.partnerId),
  ],
)

export const inventoryHistory = pgTable(
  'inventory_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').notNull().references(() => partners.id),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    delta: integer('delta').notNull(),
    reason: varchar('reason', { length: 50 }).notNull(),
    orderId: uuid('order_id'),
    cartId: uuid('cart_id'),
    performedBy: uuid('performed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_inventory_history_variant').on(table.variantId, table.createdAt),
    index('idx_inventory_history_tenant_vendor').on(table.tenantId, table.partnerId),
  ],
)

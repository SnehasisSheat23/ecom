import { boolean, index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'

export const shippingZones = pgTable(
  'shipping_zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    name: varchar('name', { length: 100 }).notNull().default('Domestic'),
    countries: jsonb('countries').$type<string[]>().notNull().default(['IN']),
    pincodes: jsonb('pincodes').$type<string[]>().notNull().default([]),
    rate: integer('rate').notNull(),
    isDefault: boolean('is_default').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_shipping_zones_tenant').on(table.tenantId),
    index('idx_shipping_zones_default').on(table.tenantId, table.isDefault),
  ],
)

export interface DeliverySlotDefinition {
  id: string
  label: string
  timeWindow: string
  cutoffTime: string
  surchargeCents: number
}

export const shippingMethods = pgTable(
  'shipping_methods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id'),
    zoneId: uuid('zone_id').references(() => shippingZones.id),
    name: varchar('name', { length: 100 }).notNull(),
    strategy: varchar('strategy', { length: 30 }).notNull().default('flat'),
    flatRate: integer('flat_rate'),
    ratePerKg: integer('rate_per_kg'),
    minWeightG: integer('min_weight_g'),
    maxWeightG: integer('max_weight_g'),
    slots: jsonb('slots').$type<DeliverySlotDefinition[]>().notNull().default([]),
    estimatedDays: integer('estimated_days').notNull().default(5),
    isActive: boolean('is_active').notNull().default(true),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_shipping_methods_tenant').on(table.tenantId, table.isActive),
    index('idx_shipping_methods_vendor').on(table.tenantId, table.partnerId),
  ],
)

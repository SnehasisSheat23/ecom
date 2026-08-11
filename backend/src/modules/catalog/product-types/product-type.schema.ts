import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { tenants } from '../../../layers/tenancy/tenancy.schema.js'

export interface AttributeSchemaField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: string[]
  required?: boolean
}

export const productTypes = pgTable(
  'product_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id'), // NULL = Tenant Global, NOT NULL = Vendor Custom
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    defaultProductType: varchar('default_product_type', { length: 20 })
      .$type<'physical' | 'digital'>()
      .notNull()
      .default('physical'),
    attributesSchema: jsonb('attributes_schema')
      .$type<AttributeSchemaField[]>()
      .notNull()
      .default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_product_type_slug_tenant').on(table.tenantId, table.slug),
    index('idx_product_types_tenant_vendor').on(table.tenantId, table.partnerId),
    index('idx_product_types_tenant_status').on(table.tenantId, table.isActive),
  ],
)

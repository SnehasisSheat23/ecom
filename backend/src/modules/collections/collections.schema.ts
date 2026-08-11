import { boolean, index, integer, pgTable, primaryKey, timestamp, uniqueIndex, uuid, varchar, text } from 'drizzle-orm/pg-core'
import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { products } from '../catalog/catalog.schema.js'

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    imageUrl: varchar('image_url', { length: 500 }),
    displayType: varchar('display_type', { length: 20 })
      .$type<'TREE' | 'GRID' | 'LIST'>()
      .notNull()
      .default('GRID'),
    sortOrder: integer('sort_order').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_collection_slug_tenant').on(table.tenantId, table.slug),
    index('idx_collections_tenant_status').on(table.tenantId, table.isActive),
  ],
)

export const productCollections = pgTable(
  'product_collections',
  {
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.collectionId] }),
    index('idx_product_collections_tenant_col').on(table.tenantId, table.collectionId),
    index('idx_product_collections_tenant_prod').on(table.tenantId, table.productId),
  ],
)

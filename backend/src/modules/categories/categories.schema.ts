import { AnyPgColumn, boolean, index, integer, jsonb, pgTable, primaryKey, timestamp, uniqueIndex, uuid, varchar, text } from 'drizzle-orm/pg-core'
import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { products } from '../catalog/catalog.schema.js'

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    imageUrl: varchar('image_url', { length: 500 }),
    displayType: varchar('display_type', { length: 20 })
      .$type<'TREE' | 'GRID' | 'LIST'>()
      .notNull()
      .default('TREE'),
    level: integer('level').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    isActive: boolean('is_active').notNull().default(true),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 500 }),
    h1: varchar('h1', { length: 255 }),
    h2: text('h2'),
    keywords: jsonb('keywords').$type<string[]>().default([]),
    translations: jsonb('translations').$type<Record<string, Record<string, any>>>().notNull().default({}),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_category_slug_tenant').on(table.tenantId, table.slug),
    index('idx_categories_tenant_parent').on(table.tenantId, table.parentId),
    index('idx_categories_tenant_status').on(table.tenantId, table.isActive),
  ],
)

export const productCategories = pgTable(
  'product_categories',
  {
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.categoryId] }),
    index('idx_product_categories_tenant_cat').on(table.tenantId, table.categoryId),
    index('idx_product_categories_tenant_prod').on(table.tenantId, table.productId),
  ],
)

import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'

import { productTypes } from './product-types/product-type.schema.js'
export { productTypes } from './product-types/product-type.schema.js'

export { categories, productCategories } from '../categories/categories.schema.js'
export { collections, productCollections } from '../collections/collections.schema.js'

export const productStatusEnum = pgEnum('product_status', ['draft', 'active', 'archived'])
export const productTypeEnum = pgEnum('product_type', ['physical', 'digital'])

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').notNull(),
    productTypeId: uuid('product_type_id').references(() => productTypes.id),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),
    status: productStatusEnum('status').notNull().default('draft'),
    productType: productTypeEnum('product_type').notNull().default('physical'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 500 }),
    canonicalUrl: varchar('canonical_url', { length: 500 }),
    taxClass: varchar('tax_class', { length: 50 }),
    approvalStatus: varchar('approval_status', { length: 20 })
      .$type<'PENDING' | 'APPROVED' | 'REJECTED'>()
      .notNull()
      .default('PENDING'),
    rejectionReason: varchar('rejection_reason', { length: 1000 }),
    vendorCommissionOverride: numeric('vendor_commission_override', { precision: 5, scale: 2 }),
    catalogType: varchar('catalog_type', { length: 20 })
      .$type<'REGULAR' | 'BUNDLE' | 'COMPONENT'>()
      .notNull()
      .default('REGULAR'),
    specifications: jsonb('specifications').$type<Record<string, string>>().notNull().default({}),
    translations: jsonb('translations').$type<Record<string, Record<string, any>>>().notNull().default({}),
    options: jsonb('options')
      .$type<Array<{ name: string; values: string[]; position: number }>>()
      .notNull()
      .default([]),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_products_tenant_status').on(table.tenantId, table.status),
    index('idx_products_tenant_vendor').on(table.tenantId, table.partnerId),
    index('idx_products_tenant_approval_vendor').on(table.tenantId, table.approvalStatus, table.partnerId),
    uniqueIndex('uq_product_slug_tenant').on(table.tenantId, table.slug),
    index('idx_products_tenant_product_type').on(table.tenantId, table.productTypeId, table.status, table.approvalStatus, table.createdAt),
    index('idx_products_storefront_listing')
      .on(table.tenantId, table.status, table.approvalStatus, table.createdAt.desc())
      .where(sql`deleted_at IS NULL`),
    index('idx_products_tags').using('gin', table.tags),
  ],
)

export const variants = pgTable(
  'variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    productId: uuid('product_id').notNull().references(() => products.id),
    sku: varchar('sku', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default({}),
    trackInventory: boolean('track_inventory').notNull().default(true),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    weightGrams: integer('weight_grams'),
    lengthMm: integer('length_mm'),
    widthMm: integer('width_mm'),
    heightMm: integer('height_mm'),
    costPerItem: integer('cost_per_item'),
    barcode: varchar('barcode', { length: 100 }),
    countryOfOrigin: varchar('country_of_origin', { length: 100 }),
    hsCode: varchar('hs_code', { length: 50 }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_variant_sku_tenant')
      .on(table.tenantId, table.sku)
      .where(sql`deleted_at IS NULL`),
    index('idx_variants_product').on(table.productId),
    index('idx_variants_sku').on(table.tenantId, table.sku),
  ],
)

import { mediaAssets } from '../media/media.schema.js'

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    productId: uuid('product_id').notNull().references(() => products.id),
    variantId: uuid('variant_id').references(() => variants.id),
    mediaId: uuid('media_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
    altText: varchar('alt_text', { length: 255 }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_product_images_product').on(table.productId)],
)

export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    oldPrice: integer('old_price').notNull(),
    newPrice: integer('new_price').notNull(),
    changedBy: uuid('changed_by'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_price_history_variant').on(table.variantId, table.changedAt)],
)

export const variantPrices = pgTable(
  'variant_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    variantId: uuid('variant_id').notNull().references(() => variants.id, { onDelete: 'cascade' }),
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    costPerItem: integer('cost_per_item'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_variant_price_currency').on(table.tenantId, table.variantId, table.currencyCode),
    index('idx_variant_prices_lookup').on(table.tenantId, table.currencyCode, table.price),
    index('idx_variant_prices_variant').on(table.variantId),
  ],
)


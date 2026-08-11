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
  integer,
} from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { partners } from '../partner/partner.schema.js'
import { customers } from '../customers/customers.schema.js'

export const blogCategories = pgTable(
  'blog_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    isVisible: boolean('is_visible').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_blog_category_slug_tenant').on(table.tenantId, table.slug),
    index('idx_blog_categories_tenant').on(table.tenantId),
  ],
)

export const blogs = pgTable(
  'blogs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').references(() => partners.id),
    categoryId: uuid('category_id').references(() => blogCategories.id),
    authorId: uuid('author_id').notNull().references(() => customers.id),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    excerpt: varchar('excerpt', { length: 500 }),
    content: text('content').notNull(),
    coverImageUrl: varchar('cover_image_url', { length: 500 }),
    status: varchar('status', { length: 20 })
      .$type<'draft' | 'pending_review' | 'published' | 'rejected'>()
      .notNull()
      .default('draft'),
    isVisible: boolean('is_visible').notNull().default(true),
    rejectionReason: varchar('rejection_reason', { length: 1000 }),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 500 }),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_blog_slug_tenant').on(table.tenantId, table.slug),
    index('idx_blogs_tenant').on(table.tenantId),
    index('idx_blogs_vendor').on(table.partnerId),
    index('idx_blogs_status').on(table.tenantId, table.status, table.isVisible),
    index('idx_blogs_category').on(table.categoryId),
  ],
)

export const blogImages = pgTable(
  'blog_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
    url: varchar('url', { length: 500 }).notNull(),
    altText: varchar('alt_text', { length: 255 }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_blog_images_blog').on(table.blogId),
  ],
)

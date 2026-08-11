import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { tenants } from '../../layers/tenancy/tenancy.schema.js'

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id'),
    url: varchar('url', { length: 500 }).notNull(),
    storagePath: varchar('storage_path', { length: 500 }),
    filename: varchar('filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull().default('image/jpeg'),
    sizeBytes: integer('size_bytes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
)

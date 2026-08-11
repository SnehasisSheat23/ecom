import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { partners } from '../partner/partner.schema.js'

export const partnerDeliveryConfigs = pgTable(
  'partner_delivery_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').references(() => partners.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull().default('manual'),
    credentials: jsonb('credentials').$type<{
      apiKey?: string
      apiSecret?: string
      authToken?: string
      baseUrl?: string
      accountId?: string
    }>(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_partner_delivery_config').on(table.tenantId, table.partnerId),
    index('idx_partner_delivery_configs_tenant').on(table.tenantId),
  ],
)

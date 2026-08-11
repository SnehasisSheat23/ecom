import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'

export const activityEntityTypeEnum = pgEnum('activity_entity_type', [
  'ORDER',
  'PRODUCT',
  'INVENTORY',
  'STAFF',
  'DELIVERY',
  'FULFILLMENT',
  'SETTINGS',
])

export const activityActorTypeEnum = pgEnum('activity_actor_type', [
  'STAFF_USER',
  'TENANT_ADMIN',
  'SELLER_PARTNER',
  'DELIVERY_PARTNER',
  'CUSTOMER',
  'SYSTEM',
])

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    entityType: activityEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    actorType: activityActorTypeEnum('actor_type').notNull().default('SYSTEM'),
    actorId: uuid('actor_id'),
    actorName: varchar('actor_name', { length: 255 }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_activity_logs_tenant_entity').on(table.tenantId, table.entityType, table.entityId),
    index('idx_activity_logs_tenant_actor').on(table.tenantId, table.actorId),
    index('idx_activity_logs_tenant_created').on(table.tenantId, table.createdAt),
  ],
)

import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { paymentIntents } from '../orders/orders.schema.js'

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    paymentIntentId: uuid('payment_intent_id').references(() => paymentIntents.id),
    provider: varchar('provider', { length: 30 }).notNull(),
    providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 50 }).$type<
      'payment.captured' | 'payment.failed' | 'payment.refunded' | 'payment.partially_refunded'
    >().notNull(),
    paymentId: varchar('payment_id', { length: 255 }),
    amount: integer('amount'),
    currency: varchar('currency', { length: 3 }),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_payment_events_tenant_provider_event_id').on(table.tenantId, table.providerEventId),
    index('idx_payment_events_tenant_intent').on(table.tenantId, table.paymentIntentId),
  ],
)

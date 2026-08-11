import { index, jsonb, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import { customers } from '../customers/customers.schema.js'
import { orders } from '../orders/orders.schema.js'
import { partners } from '../partner/partner.schema.js'

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    customerId: uuid('customer_id').notNull().references(() => customers.id),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    partnerId: uuid('partner_id').references(() => partners.id),
    subject: varchar('subject', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).$type<'REFUND_REQUEST' | 'MISSING_ITEM' | 'QUALITY_ISSUE' | 'INQUIRY' | 'OTHER'>().notNull(),
    priority: varchar('priority', { length: 20 }).$type<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>().notNull().default('MEDIUM'),
    status: varchar('status', { length: 20 }).$type<'OPEN' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED'>().notNull().default('OPEN'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_support_tickets_tenant').on(table.tenantId),
    index('idx_support_tickets_customer').on(table.customerId),
    index('idx_support_tickets_order').on(table.orderId),
    index('idx_support_tickets_vendor').on(table.partnerId),
  ],
)

export const supportMessages = pgTable(
  'support_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    ticketId: uuid('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull().references(() => customers.id),
    senderType: varchar('sender_type', { length: 20 }).$type<'CUSTOMER' | 'VENDOR' | 'ADMIN'>().notNull(),
    content: text('content').notNull(),
    attachments: jsonb('attachments').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_support_messages_ticket').on(table.ticketId),
  ],
)

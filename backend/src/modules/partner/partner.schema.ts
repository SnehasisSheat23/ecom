import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'

import { tenants } from '../../layers/tenancy/tenancy.schema.js'
import type { PartnerRole, PartnerType } from '../../types/enums.js'

export const partnerStatusEnum = pgEnum('partner_status', ['onboarding', 'active', 'suspended'])

export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    type: varchar('type', { length: 30 }).$type<PartnerType>().notNull().default('SELLER'),
    status: partnerStatusEnum('status').notNull().default('onboarding'),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    description: varchar('description', { length: 1000 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    taxId: varchar('tax_id', { length: 50 }),
    address: jsonb('address').$type<Record<string, unknown>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_partner_slug_tenant').on(table.tenantId, table.slug),
    index('idx_partners_tenant').on(table.tenantId),
  ],
)

export const partnerMembers = pgTable(
  'partner_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    partnerId: uuid('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: varchar('role', { length: 20 }).$type<PartnerRole>().notNull().default('staff'),
    permissions: jsonb('permissions').$type<string[] | null>().default(null),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_partner_member_tenant_partner_user').on(
      table.tenantId,
      table.partnerId,
      table.userId,
    ),
    index('idx_partner_members_user').on(table.userId),
  ],
)


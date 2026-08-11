import { and, count, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import {
  addresses,
  customers,
  guestSessions,
  passwordResetTokens,
  refreshTokens,
} from './customers.schema.js'
import { orders } from '../orders/orders.schema.js'
import type {
  Address,
  Customer,
  CustomerListFilters,
  GuestSession,
  PaginatedCustomersResult,
  PasswordResetToken,
  RefreshTokenRecord,
  PartnerMembership,
} from './customers.types.js'

const mapCustomer = (row: typeof customers.$inferSelect): Customer => row
const mapAddress = (row: typeof addresses.$inferSelect): Address => row
const mapGuestSession = (row: typeof guestSessions.$inferSelect): GuestSession => row
const mapRefresh = (row: typeof refreshTokens.$inferSelect): RefreshTokenRecord => row
const mapReset = (row: typeof passwordResetTokens.$inferSelect): PasswordResetToken => row

export class CustomerRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.email, email.toLowerCase())))
      .limit(1)
    return row ? mapCustomer(row) : null
  }

  async findByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)))
      .limit(1)
    return row ? mapCustomer(row) : null
  }

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .limit(1)
    return row ? mapCustomer(row) : null
  }

  async findBySupabaseId(tenantId: string, supabaseAuthId: string): Promise<Customer | null> {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.supabaseAuthId, supabaseAuthId)))
      .limit(1)
    return row ? mapCustomer(row) : null
  }

  async create(data: typeof customers.$inferInsert): Promise<Customer> {
    const [row] = await this.db.insert(customers).values(data).returning()
    return mapCustomer(row)
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<typeof customers.$inferInsert>,
  ): Promise<Customer> {
    const [row] = await this.db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning()
    return mapCustomer(row)
  }

  async updateAdminStatus(tenantId: string, id: string, isAdmin: boolean): Promise<Customer | null> {
    const [row] = await this.db
      .update(customers)
      .set({ isAdmin, updatedAt: new Date() })
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .returning()
    return row ? mapCustomer(row) : null
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.db
      .update(customers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
  }

  async listVendorMemberships(tenantId: string, customerId: string): Promise<PartnerMembership[]> {
    const result = await this.db.execute(sql<{
      partnerId: string
      role: PartnerMembership['role']
      status: PartnerMembership['status']
    }>`
      SELECT
        pm.partner_id AS "partnerId",
        pm.role AS "role",
        p.status AS "status"
      FROM partner_members pm
      INNER JOIN partners p ON p.id = pm.partner_id
      WHERE pm.tenant_id = ${tenantId}
        AND pm.user_id = ${customerId}
        AND p.deleted_at IS NULL
      ORDER BY p.name ASC
    `)

    const memberships = result.rows.map((row) => ({
      partnerId: String(row.partnerId),
      role: row.role as PartnerMembership['role'],
      status: row.status as PartnerMembership['status'],
    }))
    if (memberships.length > 0) {
      return memberships
    }

    const customer = await this.findById(tenantId, customerId)
    if (!customer?.partnerId) {
      return []
    }

    return [{ partnerId: customer.partnerId, role: 'staff', status: 'active' }]
  }

  async list(tenantId: string, filters?: CustomerListFilters): Promise<PaginatedCustomersResult<Customer>> {
    const page = Math.max(1, filters?.page ?? 1)
    const perPage = Math.min(100, Math.max(1, filters?.perPage ?? 50))
    const offset = (page - 1) * perPage

    let searchFilterSql = sql``
    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`
      searchFilterSql = sql`AND (
        LOWER(c.email) LIKE ${q} OR 
        LOWER(c.phone) LIKE ${q} OR 
        LOWER(c.first_name) LIKE ${q} OR 
        LOWER(c.last_name) LIKE ${q}
      )`
    }

    const totalRes = await this.db.execute<{ count: number }>(sql`
      SELECT count(*)::int AS count
      FROM customers c
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.deleted_at IS NULL
        AND c.is_admin = false
        ${searchFilterSql}
    `)
    const totalCount = Number(totalRes.rows[0]?.count ?? 0)

    const rowsRes = await this.db.execute<any>(sql`
      SELECT 
        c.id,
        c.tenant_id AS "tenantId",
        c.partner_id AS "partnerId",
        c.supabase_auth_id AS "supabaseAuthId",
        c.email,
        c.phone,
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.avatar_url AS "avatarUrl",
        c.is_admin AS "isAdmin",
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        c.deleted_at AS "deletedAt",
        COALESCE(count(o.id), 0)::int AS "ordersCount",
        COALESCE(sum(o.total), 0)::bigint AS "totalSpentPaise",
        max(o.created_at) AS "lastOrderDate",
        (
          SELECT o2.shipping_address_snapshot->>'city'
          FROM orders o2
          WHERE o2.customer_id = c.id AND o2.shipping_address_snapshot->>'city' IS NOT NULL
          ORDER BY o2.created_at DESC
          LIMIT 1
        ) AS "city"
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.deleted_at IS NULL
        AND c.is_admin = false
        ${searchFilterSql}
      GROUP BY c.id
      ORDER BY COALESCE(sum(o.total), 0) DESC, c.created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `)

    const items = rowsRes.rows.map((row) => ({
      ...mapCustomer(row as any),
      ordersCount: Number(row.ordersCount || 0),
      totalSpent: Number(row.totalSpentPaise || 0) / 100,
      lastOrderDate: row.lastOrderDate ? new Date(row.lastOrderDate).toISOString() : null,
      city: row.city || 'Mumbai',
    }))

    return {
      items: items as any,
      page,
      perPage,
      total: totalCount,
    }
  }
}

export class AddressRepository {
  constructor(private readonly db: Database) {}

  async findByCustomer(tenantId: string, customerId: string): Promise<Address[]> {
    const rows = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.tenantId, tenantId), eq(addresses.customerId, customerId)))
    return rows.map(mapAddress)
  }

  async findById(tenantId: string, id: string, customerId: string): Promise<Address | null> {
    const [row] = await this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.tenantId, tenantId),
          eq(addresses.id, id),
          eq(addresses.customerId, customerId),
        ),
      )
      .limit(1)
    return row ? mapAddress(row) : null
  }

  async create(data: typeof addresses.$inferInsert): Promise<Address> {
    const [row] = await this.db.insert(addresses).values(data).returning()
    return mapAddress(row)
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<typeof addresses.$inferInsert>,
  ): Promise<Address> {
    const [row] = await this.db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(addresses.tenantId, tenantId), eq(addresses.id, id)))
      .returning()
    return mapAddress(row)
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.db.delete(addresses).where(and(eq(addresses.tenantId, tenantId), eq(addresses.id, id)))
  }

  async countByCustomer(tenantId: string, customerId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(addresses)
      .where(and(eq(addresses.tenantId, tenantId), eq(addresses.customerId, customerId)))
    return row?.total ?? 0
  }

  async clearDefaultShipping(tenantId: string, customerId: string): Promise<void> {
    await this.db
      .update(addresses)
      .set({ isDefaultShipping: false, updatedAt: new Date() })
      .where(and(eq(addresses.tenantId, tenantId), eq(addresses.customerId, customerId)))
  }

  async clearDefaultBilling(tenantId: string, customerId: string): Promise<void> {
    await this.db
      .update(addresses)
      .set({ isDefaultBilling: false, updatedAt: new Date() })
      .where(and(eq(addresses.tenantId, tenantId), eq(addresses.customerId, customerId)))
  }
}

export class GuestSessionRepository {
  constructor(private readonly db: Database) {}

  async create(tenantId: string, input: { id?: string; expiresAt?: Date }): Promise<GuestSession> {
    const expiresAt = input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const [row] = await this.db
      .insert(guestSessions)
      .values({
        id: input.id,
        tenantId,
        expiresAt,
      })
      .returning()
    return mapGuestSession(row)
  }

  async findById(tenantId: string, id: string): Promise<GuestSession | null> {
    const [row] = await this.db
      .select()
      .from(guestSessions)
      .where(and(eq(guestSessions.tenantId, tenantId), eq(guestSessions.id, id)))
      .limit(1)
    return row ? mapGuestSession(row) : null
  }

  async linkCart(tenantId: string, sessionId: string, cartId: string): Promise<void> {
    await this.db
      .update(guestSessions)
      .set({ cartId })
      .where(and(eq(guestSessions.tenantId, tenantId), eq(guestSessions.id, sessionId)))
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.db.delete(guestSessions).where(and(eq(guestSessions.tenantId, tenantId), eq(guestSessions.id, id)))
  }

  async deleteExpired(tenantId: string): Promise<number> {
    const rows = await this.db
      .delete(guestSessions)
      .where(and(eq(guestSessions.tenantId, tenantId), sql`${guestSessions.expiresAt} < NOW()`))
      .returning({ id: guestSessions.id })
    return rows.length
  }
}

export class RefreshTokenRepository {
  constructor(private readonly db: Database) {}

  async create(data: typeof refreshTokens.$inferInsert): Promise<RefreshTokenRecord> {
    const [row] = await this.db.insert(refreshTokens).values(data).returning()
    return mapRefresh(row)
  }

  async findActive(tenantId: string, tokenHash: string): Promise<RefreshTokenRecord | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tenantId, tenantId),
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
    return row ? mapRefresh(row) : null
  }

  async revoke(tenantId: string, tokenHash: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tenantId, tenantId), eq(refreshTokens.tokenHash, tokenHash)))
  }
}

export class PasswordResetRepository {
  constructor(private readonly db: Database) {}

  async create(data: typeof passwordResetTokens.$inferInsert): Promise<PasswordResetToken> {
    const [row] = await this.db.insert(passwordResetTokens).values(data).returning()
    return mapReset(row)
  }

  async findActive(
    tenantId: string,
    customerId: string,
    otpHash: string,
  ): Promise<PasswordResetToken | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tenantId, tenantId),
          eq(passwordResetTokens.customerId, customerId),
          eq(passwordResetTokens.otpHash, otpHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
    return row ? mapReset(row) : null
  }

  async markUsed(tenantId: string, customerId: string, id: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.tenantId, tenantId),
          eq(passwordResetTokens.customerId, customerId),
          eq(passwordResetTokens.id, id),
        ),
      )
  }
}

import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import { AppError } from '../../lib/errors.js'
import type { PaginatedResult } from '../../lib/types.js'
import { partners } from './partner.schema.js'
import type { CreatePartnerInput, Partner, PartnerStatus, UpdatePartnerInput } from './partner.types.js'

const mapPartner = (row: typeof partners.$inferSelect): Partner => ({
  ...row,
  description: row.description ?? null,
  logoUrl: row.logoUrl ?? null,
  taxId: row.taxId ?? null,
  address: (row.address as Record<string, unknown> | null) ?? null,
  metadata: (row.metadata as Record<string, unknown>) ?? {},
})

export class PartnerRepository {
  constructor(private readonly db: Database) {}

  getDb(): Database {
    return this.db
  }

  async findPartnersByIds(tenantId: string, partnerIds: string[]): Promise<Partner[]> {
    if (partnerIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(partners)
      .where(and(eq(partners.tenantId, tenantId), inArray(partners.id, partnerIds), isNull(partners.deletedAt)))
    return rows.map(mapPartner)
  }

  async createPartner(tenantId: string, input: CreatePartnerInput & { slug: string }): Promise<Partner> {
    const [row] = await this.db
      .insert(partners)
      .values({
        tenantId,
        name: input.name,
        slug: input.slug,
        email: input.email ?? null,
        phone: input.phone ?? null,
        description: input.description ?? null,
        logoUrl: input.logoUrl ?? null,
        taxId: input.taxId ?? null,
        address: input.address ?? null,
        metadata: input.metadata ?? {},
        status: input.status ?? 'onboarding',
      })
      .returning()

    return mapPartner(row)
  }

  async listPartners(
    tenantId: string,
    options: { status?: PartnerStatus; page: number; perPage: number }
  ): Promise<PaginatedResult<Partner>> {
    const offset = (options.page - 1) * options.perPage
    const conditions = [eq(partners.tenantId, tenantId), isNull(partners.deletedAt)]

    if (options.status) {
      conditions.push(eq(partners.status, options.status))
    }

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(partners)
        .where(and(...conditions))
        .orderBy(asc(partners.name))
        .limit(options.perPage)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(partners)
        .where(and(...conditions)),
    ])

    return {
      items: rows.map((r) => ({
        ...mapPartner(r),
        pincodeCount: 0,
      })),
      page: options.page,
      perPage: options.perPage,
      total: totalResult[0]?.total ?? 0,
    }
  }

  async findPartnerById(tenantId: string, partnerId: string | null): Promise<Partner | null> {
    if (partnerId === null) return null
    const [row] = await this.db
      .select()
      .from(partners)
      .where(and(eq(partners.tenantId, tenantId), eq(partners.id, partnerId)))
      .limit(1)
    return row ? mapPartner(row) : null
  }

  async findPartnerBySlug(tenantId: string, slug: string): Promise<Partner | null> {
    const [row] = await this.db
      .select()
      .from(partners)
      .where(and(eq(partners.tenantId, tenantId), eq(partners.slug, slug)))
      .limit(1)
    return row ? mapPartner(row) : null
  }

  async updatePartner(tenantId: string, partnerId: string, input: UpdatePartnerInput): Promise<Partner> {
    const [row] = await this.db
      .update(partners)
      .set({
        name: input.name,
        slug: input.slug,
        email: input.email,
        phone: input.phone,
        description: input.description,
        logoUrl: input.logoUrl,
        taxId: input.taxId,
        address: input.address,
        metadata: input.metadata,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(and(eq(partners.tenantId, tenantId), eq(partners.id, partnerId)))
      .returning()

    if (!row) {
      throw new AppError('Partner not found', 404, 'partner-not-found')
    }

    return mapPartner(row)
  }

  async softDeletePartner(tenantId: string, partnerId: string): Promise<void> {
    await this.db
      .update(partners)
      .set({ deletedAt: new Date(), updatedAt: new Date(), status: 'suspended' })
      .where(and(eq(partners.tenantId, tenantId), eq(partners.id, partnerId)))
  }
}

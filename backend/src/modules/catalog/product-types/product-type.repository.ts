import { and, count, eq, ilike, or, isNull } from 'drizzle-orm'
import type { Database } from '../../../lib/db.js'
import { productTypes } from './product-type.schema.js'
import type {
  CatalogProductType,
  CreateProductTypeInput,
  ProductTypeQueryFilters,
  UpdateProductTypeInput,
} from './product-type.types.js'

const mapProductType = (row: typeof productTypes.$inferSelect): CatalogProductType => ({
  id: row.id,
  tenantId: row.tenantId,
  partnerId: row.partnerId,
  name: row.name,
  slug: row.slug,
  description: row.description,
  defaultProductType: row.defaultProductType,
  attributesSchema: row.attributesSchema ?? [],
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export class ProductTypeRepository {
  constructor(private readonly db: Database) {}

  async createProductType(
    tenantId: string,
    input: CreateProductTypeInput & { slug: string },
  ): Promise<CatalogProductType> {
    const [inserted] = await this.db
      .insert(productTypes)
      .values({
        tenantId,
        partnerId: input.partnerId ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        defaultProductType: input.defaultProductType ?? 'physical',
        attributesSchema: input.attributesSchema ?? [],
        isActive: input.isActive ?? true,
      })
      .returning()

    return mapProductType(inserted)
  }

  async updateProductType(
    tenantId: string,
    id: string,
    input: UpdateProductTypeInput,
  ): Promise<CatalogProductType | null> {
    const [updated] = await this.db
      .update(productTypes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(productTypes.tenantId, tenantId), eq(productTypes.id, id)))
      .returning()

    return updated ? mapProductType(updated) : null
  }

  async deleteProductType(tenantId: string, id: string): Promise<boolean> {
    const [deleted] = await this.db
      .delete(productTypes)
      .where(and(eq(productTypes.tenantId, tenantId), eq(productTypes.id, id)))
      .returning()

    return !!deleted
  }

  async findById(tenantId: string, id: string): Promise<CatalogProductType | null> {
    const [row] = await this.db
      .select()
      .from(productTypes)
      .where(and(eq(productTypes.tenantId, tenantId), eq(productTypes.id, id)))
      .limit(1)

    return row ? mapProductType(row) : null
  }

  async findBySlug(tenantId: string, slug: string): Promise<CatalogProductType | null> {
    const [row] = await this.db
      .select()
      .from(productTypes)
      .where(and(eq(productTypes.tenantId, tenantId), eq(productTypes.slug, slug)))
      .limit(1)

    return row ? mapProductType(row) : null
  }

  async listProductTypes(
    tenantId: string,
    filters: ProductTypeQueryFilters = {},
  ): Promise<{ items: CatalogProductType[]; total: number; page: number; perPage: number }> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions = [eq(productTypes.tenantId, tenantId)]

    if (filters.isActive !== undefined) {
      conditions.push(eq(productTypes.isActive, filters.isActive))
    }

    if (filters.partnerId !== undefined) {
      if (filters.partnerId === null) {
        conditions.push(isNull(productTypes.partnerId))
      } else {
        conditions.push(or(isNull(productTypes.partnerId), eq(productTypes.partnerId, filters.partnerId))!)
      }
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(productTypes.name, `%${filters.search}%`),
          ilike(productTypes.slug, `%${filters.search}%`),
        )!,
      )
    }

    const whereClause = and(...conditions)

    const [countResult] = await this.db
      .select({ count: count(productTypes.id) })
      .from(productTypes)
      .where(whereClause)

    const total = Number(countResult?.count ?? 0)

    const rows = await this.db
      .select()
      .from(productTypes)
      .where(whereClause)
      .limit(perPage)
      .offset(offset)

    return {
      items: rows.map(mapProductType),
      total,
      page,
      perPage,
    }
  }
}

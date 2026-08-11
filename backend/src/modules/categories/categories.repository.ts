import { and, eq, inArray, sql, asc, desc } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { categories, productCategories } from './categories.schema.js'
import type {
  Category,
  CategoryFilters,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categories.types.js'

const mapCategory = (row: typeof categories.$inferSelect): Category => ({
  id: row.id,
  tenantId: row.tenantId,
  parentId: row.parentId,
  name: row.name,
  slug: row.slug,
  description: row.description,
  imageUrl: row.imageUrl,
  displayType: row.displayType,
  level: row.level,
  sortOrder: row.sortOrder,
  status: row.status,
  isActive: row.isActive,
  metaTitle: row.metaTitle,
  metaDescription: row.metaDescription,
  h1: row.h1,
  h2: row.h2,
  keywords: row.keywords ?? [],
  translations: (row.translations as Record<string, Record<string, any>>) ?? {},
  createdBy: row.createdBy,
  updatedBy: row.updatedBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export class CategoriesRepository {
  constructor(private db: Database) {}

  async create(
    tenantId: string,
    input: CreateCategoryInput & { slug: string; level?: number },
    actorId?: string,
  ): Promise<Category> {
    const [row] = await this.db
      .insert(categories)
      .values({
        tenantId,
        parentId: input.parentId ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        displayType: input.displayType ?? 'TREE',
        level: input.level ?? 0,
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? 'ACTIVE',
        isActive: input.isActive ?? true,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        h1: input.h1 ?? null,
        h2: input.h2 ?? null,
        keywords: input.keywords ?? [],
        translations: input.translations ?? {},
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
      })
      .returning()

    return mapCategory(row)
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateCategoryInput & { slug?: string; level?: number },
    actorId?: string,
  ): Promise<Category> {
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: actorId ?? null,
    }

    if (input.name !== undefined) updatePayload.name = input.name
    if (input.slug !== undefined) updatePayload.slug = input.slug
    if (input.parentId !== undefined) updatePayload.parentId = input.parentId
    if (input.description !== undefined) updatePayload.description = input.description
    if (input.imageUrl !== undefined) updatePayload.imageUrl = input.imageUrl
    if (input.displayType !== undefined) updatePayload.displayType = input.displayType
    if (input.level !== undefined) updatePayload.level = input.level
    if (input.sortOrder !== undefined) updatePayload.sortOrder = input.sortOrder
    if (input.metaTitle !== undefined) updatePayload.metaTitle = input.metaTitle
    if (input.metaDescription !== undefined) updatePayload.metaDescription = input.metaDescription
    if (input.h1 !== undefined) updatePayload.h1 = input.h1
    if (input.h2 !== undefined) updatePayload.h2 = input.h2
    if (input.keywords !== undefined) updatePayload.keywords = input.keywords
    if (input.translations !== undefined) updatePayload.translations = input.translations
    if (input.status !== undefined) {
      updatePayload.status = input.status
      updatePayload.isActive = input.status === 'ACTIVE'
    }
    if (input.isActive !== undefined) {
      updatePayload.isActive = input.isActive
      if (input.status === undefined) {
        updatePayload.status = input.isActive ? 'ACTIVE' : 'INACTIVE'
      }
    }

    const [row] = await this.db
      .update(categories)
      .set(updatePayload)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))
      .returning()

    return mapCategory(row)
  }

  async findById(tenantId: string, id: string): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))

    return row ? mapCategory(row) : null
  }

  async findBySlug(tenantId: string, slug: string): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.slug, slug)))

    return row ? mapCategory(row) : null
  }

  async findAll(tenantId: string, filters?: CategoryFilters): Promise<Category[]> {
    const conditions = [eq(categories.tenantId, tenantId)]

    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(sql`${categories.parentId} IS NULL`)
      } else {
        conditions.push(eq(categories.parentId, filters.parentId))
      }
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(categories.isActive, filters.isActive))
    }

    if (filters?.status !== undefined) {
      conditions.push(eq(categories.status, filters.status))
    }

    const rows = await this.db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name))

    return rows.map(mapCategory)
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Category[]> {
    if (!ids.length) return []
    const rows = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), inArray(categories.id, ids)))

    return rows.map(mapCategory)
  }

  async unsetParentForChildren(tenantId: string, parentId: string, nextParentId: string | null): Promise<void> {
    await this.db
      .update(categories)
      .set({ parentId: nextParentId, updatedAt: new Date() })
      .where(and(eq(categories.tenantId, tenantId), eq(categories.parentId, parentId)))
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.db
      .delete(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))
  }

  // Junction Product - Category methods
  async assignProductToCategories(tenantId: string, productId: string, categoryIds: string[]): Promise<void> {
    await this.db
      .delete(productCategories)
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.productId, productId)))

    if (categoryIds.length > 0) {
      const records = categoryIds.map((categoryId) => ({
        tenantId,
        productId,
        categoryId,
      }))
      await this.db.insert(productCategories).values(records).onConflictDoNothing()
    }
  }

  async getCategoriesForProduct(tenantId: string, productId: string): Promise<Category[]> {
    const rows = await this.db
      .select({ category: categories })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.productId, productId)))
      .orderBy(asc(categories.sortOrder), asc(categories.name))

    return rows.map((r) => mapCategory(r.category))
  }

  async getCategoriesForProducts(tenantId: string, productIds: string[]): Promise<Map<string, Category[]>> {
    const map = new Map<string, Category[]>()
    if (!productIds.length) return map

    const rows = await this.db
      .select({ productId: productCategories.productId, category: categories })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(eq(productCategories.tenantId, tenantId), inArray(productCategories.productId, productIds)))
      .orderBy(asc(categories.sortOrder), asc(categories.name))

    for (const row of rows) {
      const group = map.get(row.productId) ?? []
      group.push(mapCategory(row.category))
      map.set(row.productId, group)
    }

    return map
  }
}

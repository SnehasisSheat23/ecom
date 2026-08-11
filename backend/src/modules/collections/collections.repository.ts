import { and, eq, inArray, asc } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { collections, productCollections } from './collections.schema.js'
import type {
  Collection,
  CollectionFilters,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collections.types.js'

const mapCollection = (row: typeof collections.$inferSelect): Collection => ({
  id: row.id,
  tenantId: row.tenantId,
  name: row.name,
  slug: row.slug,
  description: row.description,
  imageUrl: row.imageUrl,
  displayType: row.displayType,
  sortOrder: row.sortOrder,
  status: row.status,
  isActive: row.isActive,
  createdBy: row.createdBy,
  updatedBy: row.updatedBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

export class CollectionsRepository {
  constructor(private db: Database) {}

  async create(
    tenantId: string,
    input: CreateCollectionInput & { slug: string },
    actorId?: string,
  ): Promise<Collection> {
    const [row] = await this.db
      .insert(collections)
      .values({
        tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        displayType: input.displayType ?? 'GRID',
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? 'ACTIVE',
        isActive: input.isActive ?? true,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
      })
      .returning()

    return mapCollection(row)
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateCollectionInput & { slug?: string },
    actorId?: string,
  ): Promise<Collection> {
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: actorId ?? null,
    }

    if (input.name !== undefined) updatePayload.name = input.name
    if (input.slug !== undefined) updatePayload.slug = input.slug
    if (input.description !== undefined) updatePayload.description = input.description
    if (input.imageUrl !== undefined) updatePayload.imageUrl = input.imageUrl
    if (input.displayType !== undefined) updatePayload.displayType = input.displayType
    if (input.sortOrder !== undefined) updatePayload.sortOrder = input.sortOrder
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
      .update(collections)
      .set(updatePayload)
      .where(and(eq(collections.tenantId, tenantId), eq(collections.id, id)))
      .returning()

    return mapCollection(row)
  }

  async findById(tenantId: string, id: string): Promise<Collection | null> {
    const [row] = await this.db
      .select()
      .from(collections)
      .where(and(eq(collections.tenantId, tenantId), eq(collections.id, id)))

    return row ? mapCollection(row) : null
  }

  async findBySlug(tenantId: string, slug: string): Promise<Collection | null> {
    const [row] = await this.db
      .select()
      .from(collections)
      .where(and(eq(collections.tenantId, tenantId), eq(collections.slug, slug)))

    return row ? mapCollection(row) : null
  }

  async findAll(tenantId: string, filters?: CollectionFilters): Promise<Collection[]> {
    const conditions = [eq(collections.tenantId, tenantId)]

    if (filters?.isActive !== undefined) {
      conditions.push(eq(collections.isActive, filters.isActive))
    }

    if (filters?.status !== undefined) {
      conditions.push(eq(collections.status, filters.status))
    }

    const rows = await this.db
      .select()
      .from(collections)
      .where(and(...conditions))
      .orderBy(asc(collections.sortOrder), asc(collections.name))

    return rows.map(mapCollection)
  }

  async findByIds(tenantId: string, ids: string[]): Promise<Collection[]> {
    if (!ids.length) return []
    const rows = await this.db
      .select()
      .from(collections)
      .where(and(eq(collections.tenantId, tenantId), inArray(collections.id, ids)))

    return rows.map(mapCollection)
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.db
      .delete(collections)
      .where(and(eq(collections.tenantId, tenantId), eq(collections.id, id)))
  }

  // Junction Product - Collection methods
  async assignProductToCollections(tenantId: string, productId: string, collectionIds: string[]): Promise<void> {
    await this.db
      .delete(productCollections)
      .where(and(eq(productCollections.tenantId, tenantId), eq(productCollections.productId, productId)))

    if (collectionIds.length > 0) {
      const records = collectionIds.map((collectionId) => ({
        tenantId,
        productId,
        collectionId,
      }))
      await this.db.insert(productCollections).values(records).onConflictDoNothing()
    }
  }

  async getCollectionsForProduct(tenantId: string, productId: string): Promise<Collection[]> {
    const rows = await this.db
      .select({ collection: collections })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(and(eq(productCollections.tenantId, tenantId), eq(productCollections.productId, productId)))
      .orderBy(asc(collections.sortOrder), asc(collections.name))

    return rows.map((r) => mapCollection(r.collection))
  }

  async getCollectionsForProducts(tenantId: string, productIds: string[]): Promise<Map<string, Collection[]>> {
    const map = new Map<string, Collection[]>()
    if (!productIds.length) return map

    const rows = await this.db
      .select({ productId: productCollections.productId, collection: collections })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(and(eq(productCollections.tenantId, tenantId), inArray(productCollections.productId, productIds)))
      .orderBy(asc(collections.sortOrder), asc(collections.name))

    for (const row of rows) {
      const group = map.get(row.productId) ?? []
      group.push(mapCollection(row.collection))
      map.set(row.productId, group)
    }

    return map
  }
}

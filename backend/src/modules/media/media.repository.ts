import { and, count, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { mediaAssets } from './media.schema.js'
import type { MediaAsset, ListMediaOptions } from './media.types.js'
import type { PaginatedResult } from '../../lib/types.js'

export class MediaRepository {
  constructor(private readonly db: Database) {}

  async createAsset(
    tenantId: string,
    input: Omit<typeof mediaAssets.$inferInsert, 'tenantId'>,
  ): Promise<MediaAsset> {
    const [row] = await this.db
      .insert(mediaAssets)
      .values({
        tenantId,
        ...input,
      })
      .returning()
    return row
  }

  async findAssetById(tenantId: string, id: string): Promise<MediaAsset | null> {
    const [row] = await this.db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.tenantId, tenantId), eq(mediaAssets.id, id)))
      .limit(1)
    return row ?? null
  }

  async listAssets(
    tenantId: string,
    options: ListMediaOptions,
  ): Promise<PaginatedResult<MediaAsset>> {
    const page = options.page ?? 1
    const perPage = options.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions: SQL[] = [eq(mediaAssets.tenantId, tenantId)]

    if (options.partnerId !== undefined) {
      if (options.partnerId === null) {
        conditions.push(isNull(mediaAssets.partnerId))
      } else {
        conditions.push(eq(mediaAssets.partnerId, options.partnerId))
      }
    }

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(mediaAssets)
        .where(and(...conditions)),
      this.db
        .select()
        .from(mediaAssets)
        .where(and(...conditions))
        .orderBy(desc(mediaAssets.createdAt))
        .limit(perPage)
        .offset(offset),
    ])

    return {
      items: rows,
      total: totalResult[0]?.total ?? 0,
      page,
      perPage,
    }
  }

  async deleteAsset(tenantId: string, id: string): Promise<void> {
    await this.db
      .delete(mediaAssets)
      .where(and(eq(mediaAssets.tenantId, tenantId), eq(mediaAssets.id, id)))
  }
}

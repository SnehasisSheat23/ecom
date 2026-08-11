import { and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import type { PaginatedResult } from '../../lib/types.js'
import { pincodeDirectory } from './pincode.schema.js'
import type { PincodeInfo, PincodeSearchFilters } from './pincode.types.js'

export class PincodeRepository {
  constructor(private readonly db: Database) {}

  private mapPincode(row: typeof pincodeDirectory.$inferSelect): PincodeInfo {
    return {
      pincode: row.pincode,
      district: row.district,
      stateName: row.stateName,
      cityGroup: `${row.district} (${row.stateName})`,
    }
  }

  async findByCode(pincode: string): Promise<PincodeInfo | null> {
    const [row] = await this.db
      .select()
      .from(pincodeDirectory)
      .where(eq(pincodeDirectory.pincode, pincode.trim()))
      .limit(1)

    return row ? this.mapPincode(row) : null
  }

  async findByCodesBatch(pincodes: string[]): Promise<PincodeInfo[]> {
    if (pincodes.length === 0) return []
    const cleanCodes = [...new Set(pincodes.map((c) => c.trim()))]
    const rows = await this.db
      .select()
      .from(pincodeDirectory)
      .where(inArray(pincodeDirectory.pincode, cleanCodes))

    return rows.map(this.mapPincode)
  }

  async loadAllPincodes(): Promise<PincodeInfo[]> {
    const rows = await this.db.select().from(pincodeDirectory)
    return rows.map(this.mapPincode)
  }

  async searchPincodes(filters: PincodeSearchFilters): Promise<PaginatedResult<PincodeInfo>> {
    const page = filters.page || 1
    const perPage = filters.perPage || 50
    const offset = (page - 1) * perPage

    const conditions = []

    if (filters.query?.trim()) {
      const q = `%${filters.query.trim()}%`
      conditions.push(
        or(
          ilike(pincodeDirectory.pincode, q),
          ilike(pincodeDirectory.district, q),
          ilike(pincodeDirectory.stateName, q)
        )
      )
    }

    if (filters.stateName?.trim()) {
      conditions.push(eq(pincodeDirectory.stateName, filters.stateName.trim()))
    }

    if (filters.district?.trim()) {
      conditions.push(eq(pincodeDirectory.district, filters.district.trim()))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, totalResult] = await Promise.all([
      this.db
        .select()
        .from(pincodeDirectory)
        .where(whereClause)
        .orderBy(asc(pincodeDirectory.pincode))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(pincodeDirectory).where(whereClause),
    ])

    return {
      items: rows.map(this.mapPincode),
      page,
      perPage,
      total: totalResult[0]?.total ?? 0,
    }
  }
}

import { and, count, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import { inventory, inventoryHistory } from './inventory.schema.js'
import type {
  CreateInventoryInput,
  InventoryHistoryFilters,
  InventoryHistoryEntry,
  InventoryHistoryReason,
  InventoryListFilters,
  InventoryRecord,
  PaginatedInventoryHistoryResult,
  PaginatedInventoryResult,
} from './inventory.types.js'

const mapInventory = (row: typeof inventory.$inferSelect): InventoryRecord => row
const mapHistory = (row: typeof inventoryHistory.$inferSelect): InventoryHistoryEntry => ({
  ...row,
  reason: row.reason as InventoryHistoryReason,
})

export class InventoryRepository {
  constructor(private readonly db: Database) {}

  async transaction<T>(callback: (repository: InventoryRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => callback(new InventoryRepository(tx as Database)))
  }

  async createInventoryRecord(tenantId: string, input: CreateInventoryInput): Promise<InventoryRecord> {
    const [row] = await this.db
      .insert(inventory)
      .values({
        tenantId,
        partnerId: input.partnerId,
        variantId: input.variantId,
        quantityAvailable: input.quantityAvailable ?? 0,
        quantityReserved: 0,
        quantitySold: 0,
        allowBackorder: input.allowBackorder ?? false,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        locationId: input.locationId || null,
      })
      .returning()

    return mapInventory(row)
  }

  async findByVariantId(tenantId: string, variantId: string): Promise<InventoryRecord | null> {
    const [row] = await this.db
      .select()
      .from(inventory)
      .where(and(eq(inventory.tenantId, tenantId), eq(inventory.variantId, variantId)))
      .limit(1)

    return row ? mapInventory(row) : null
  }

  async findByVariantIds(tenantId: string, variantIds: string[]): Promise<InventoryRecord[]> {
    if (variantIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(inventory)
      .where(and(eq(inventory.tenantId, tenantId), inArray(inventory.variantId, variantIds)))
    return rows.map(mapInventory)
  }

  async findByVariantIdForUpdate(tenantId: string, variantId: string): Promise<InventoryRecord | null> {
    const result = await this.db.execute(sql<InventoryRecord>`
      SELECT
        id,
        tenant_id AS "tenantId",
        partner_id AS "partnerId",
        variant_id AS "variantId",
        quantity_available AS "quantityAvailable",
        quantity_reserved AS "quantityReserved",
        quantity_sold AS "quantitySold",
        allow_backorder AS "allowBackorder",
        low_stock_threshold AS "lowStockThreshold",
        location_id AS "locationId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM inventory
      WHERE tenant_id = ${tenantId} AND variant_id = ${variantId}
      FOR UPDATE
    `)

    const row = result.rows[0] as any
    if (!row) return null
    return {
      id: row.id,
      tenantId: row.tenantId ?? row.tenant_id,
      partnerId: row.partnerId ?? row.partner_id ?? null,
      variantId: row.variantId ?? row.variant_id,
      quantityAvailable: Number(row.quantityAvailable ?? row.quantity_available ?? 0),
      quantityReserved: Number(row.quantityReserved ?? row.quantity_reserved ?? 0),
      quantitySold: Number(row.quantitySold ?? row.quantity_sold ?? 0),
      allowBackorder: Boolean(row.allowBackorder ?? row.allow_backorder),
      lowStockThreshold: Number(row.lowStockThreshold ?? row.low_stock_threshold ?? 5),
      locationId: row.locationId ?? row.location_id ?? null,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    }
  }

  async getPartnerIdForVariant(tenantId: string, variantId: string): Promise<string> {
    const result = await this.db.execute(sql<{ partner_id: string }>`
      SELECT p.partner_id FROM products p
      JOIN variants v ON v.product_id = p.id
      WHERE v.tenant_id = ${tenantId} AND v.id = ${variantId}
      LIMIT 1
    `)
    const row = result.rows[0] as any
    if (row?.partner_id) return row.partner_id

    const fallbackResult = await this.db.execute(sql<{ id: string }>`
      SELECT id FROM partners WHERE tenant_id = ${tenantId} LIMIT 1
    `)
    const fallbackRow = fallbackResult.rows[0] as any
    return fallbackRow?.id || '00000000-0000-0000-0000-000000000000'
  }

  async updateStock(
    tenantId: string,
    inventoryId: string,
    next: Partial<Pick<InventoryRecord, 'quantityAvailable' | 'quantityReserved' | 'quantitySold' | 'allowBackorder' | 'lowStockThreshold' | 'locationId'>>,
  ): Promise<InventoryRecord> {
    const [row] = await this.db
      .update(inventory)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(inventory.tenantId, tenantId), eq(inventory.id, inventoryId)))
      .returning()

    return mapInventory(row)
  }

  async insertHistory(input: {
    tenantId: string
    partnerId?: string | null
    variantId: string
    delta: number
    reason: InventoryHistoryReason
    orderId?: string | null
    cartId?: string | null
    performedBy?: string | null
  }): Promise<InventoryHistoryEntry> {
    const [row] = await this.db
      .insert(inventoryHistory)
      .values({
        tenantId: input.tenantId,
        partnerId: input.partnerId ?? '00000000-0000-0000-0000-000000000000',
        variantId: input.variantId,
        delta: input.delta,
        reason: input.reason,
        orderId: input.orderId || null,
        cartId: input.cartId || null,
        performedBy: input.performedBy || null,
      })
      .returning()

    return mapHistory(row)
  }

  async listInventory(
    tenantId: string,
    filters: InventoryListFilters = {},
  ): Promise<PaginatedInventoryResult> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const conditions = [eq(inventory.tenantId, tenantId)]
    if (filters.partnerId !== undefined) {
      conditions.push(
        filters.partnerId === null ? isNull(inventory.partnerId) : eq(inventory.partnerId, filters.partnerId),
      )
    }

    if (filters.lowStockOnly) {
      conditions.push(lte(inventory.quantityAvailable, inventory.lowStockThreshold))
    }

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(inventory)
      .where(and(...conditions))

    const rows = await this.db
      .select()
      .from(inventory)
      .where(and(...conditions))
      .orderBy(inventory.variantId)
      .limit(perPage)
      .offset((page - 1) * perPage)

    return {
      items: rows.map(mapInventory),
      page,
      perPage,
      total: totalRow?.total ?? 0,
    }
  }

  async listHistory(
    tenantId: string,
    variantId: string,
    filters: InventoryHistoryFilters = {},
  ): Promise<PaginatedInventoryHistoryResult> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 50
    const whereClause = and(
      eq(inventoryHistory.tenantId, tenantId),
      eq(inventoryHistory.variantId, variantId),
    )

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(inventoryHistory)
      .where(whereClause)

    const rows = await this.db
      .select()
      .from(inventoryHistory)
      .where(whereClause)
      .orderBy(desc(inventoryHistory.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    return {
      items: rows.map(mapHistory),
      page,
      perPage,
      total: totalRow?.total ?? 0,
    }
  }
}

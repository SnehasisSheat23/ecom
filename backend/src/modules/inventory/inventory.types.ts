export type InventoryHistoryReason =
  | 'reserved'
  | 'released'
  | 'sold'
  | 'restored'
  | 'manual_adjust'

export interface InventoryRecord {
  id: string
  tenantId: string
  partnerId: string
  variantId: string
  quantityAvailable: number
  quantityReserved: number
  quantitySold: number
  allowBackorder: boolean
  lowStockThreshold: number
  locationId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface InventoryHistoryEntry {
  id: string
  tenantId: string
  partnerId: string
  variantId: string
  delta: number
  reason: InventoryHistoryReason
  orderId: string | null
  cartId: string | null
  createdAt: Date
}

export interface InventoryListFilters {
  lowStockOnly?: boolean
  partnerId?: string | null
  page?: number
  perPage?: number
}

export interface InventoryHistoryFilters {
  page?: number
  perPage?: number
}

export interface PaginatedInventoryResult {
  items: InventoryRecord[]
  page: number
  perPage: number
  total: number
}

export interface PaginatedInventoryHistoryResult {
  items: InventoryHistoryEntry[]
  page: number
  perPage: number
  total: number
}

export interface InventoryAdjustmentInput {
  delta: number
  reason?: string
}

export interface CreateInventoryInput {
  variantId: string
  partnerId: string
  quantityAvailable?: number
  allowBackorder?: boolean
  lowStockThreshold?: number
  locationId?: string | null
}

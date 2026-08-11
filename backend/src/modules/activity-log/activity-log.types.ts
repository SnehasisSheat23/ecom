import type { PaginatedResult } from '../../lib/types.js'

export type ActivityEntityType =
  | 'ORDER'
  | 'PRODUCT'
  | 'INVENTORY'
  | 'STAFF'
  | 'DELIVERY'
  | 'FULFILLMENT'
  | 'SETTINGS'

export type ActivityActorType =
  | 'STAFF_USER'
  | 'TENANT_ADMIN'
  | 'SELLER_PARTNER'
  | 'DELIVERY_PARTNER'
  | 'CUSTOMER'
  | 'SYSTEM'

export interface ActivityLog {
  id: string
  tenantId: string
  entityType: ActivityEntityType
  entityId: string
  actorType: ActivityActorType
  actorId: string | null
  actorName: string | null
  eventType: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface RecordActivityLogInput {
  entityType: ActivityEntityType
  entityId: string
  actorType?: ActivityActorType
  actorId?: string | null
  actorName?: string | null
  eventType: string
  title: string
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface ActivityLogFilters {
  entityType?: ActivityEntityType
  entityId?: string
  actorId?: string
  eventType?: string
  page?: number
  perPage?: number
}

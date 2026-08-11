import { z } from 'zod'

export const recordActivityLogSchema = z.object({
  entityType: z.enum(['ORDER', 'PRODUCT', 'INVENTORY', 'STAFF', 'DELIVERY', 'FULFILLMENT', 'SETTINGS']),
  entityId: z.string().uuid(),
  actorType: z
    .enum(['STAFF_USER', 'TENANT_ADMIN', 'SELLER_PARTNER', 'DELIVERY_PARTNER', 'CUSTOMER', 'SYSTEM'])
    .optional(),
  actorId: z.string().uuid().nullable().optional(),
  actorName: z.string().max(255).nullable().optional(),
  eventType: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const entityParamsSchema = z.object({
  entityType: z.enum(['ORDER', 'PRODUCT', 'INVENTORY', 'STAFF', 'DELIVERY', 'FULFILLMENT', 'SETTINGS']),
  entityId: z.string().uuid(),
})

export const actorParamsSchema = z.object({
  actorId: z.string().uuid(),
})

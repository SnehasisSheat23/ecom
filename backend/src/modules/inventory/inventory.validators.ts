import { z } from 'zod'

export const inventoryReleaseJobPayloadSchema = z.object({
  tenantId: z.string().min(1),
  variantId: z.uuid(),
  quantity: z.number().int().positive(),
  cartId: z.uuid(),
})

export const inventoryVariantParamsSchema = z.object({
  variantId: z.uuid(),
})

export const listInventoryQuerySchema = z.object({
  lowStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export const listInventoryHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
})

export const adjustInventorySchema = z.object({
  delta: z.number().int().refine((value) => value !== 0, { message: 'Delta must not be zero' }),
  reason: z.string().min(1).max(50).optional(),
})

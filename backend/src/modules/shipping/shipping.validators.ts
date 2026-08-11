import { z } from 'zod'

export const shippingEstimateQuerySchema = z.object({
  address_id: z.uuid().optional(),
  subtotal: z.coerce.number().int().nonnegative().optional(),
  is_digital_only: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

export const createShippingMethodSchema = z.object({
  name: z.string().min(1).max(100),
  strategy: z.enum(['flat', 'weight_based']).default('flat'),
  flatRate: z.number().int().nonnegative().nullable().optional(),
  estimatedDays: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  position: z.number().int().default(0),
  partnerId: z.uuid().nullable().optional(),
  zoneId: z.uuid().nullable().optional(),
})

export const updateShippingMethodSchema = createShippingMethodSchema.partial()

export const createShippingZoneSchema = z.object({
  name: z.string().min(1).max(100),
  countries: z.array(z.string().length(2)).default(['IN']),
  pincodes: z.array(z.string()).default([]),
  rate: z.number().int().nonnegative().default(0),
  isDefault: z.boolean().default(false),
})

export const updateShippingZoneSchema = createShippingZoneSchema.partial()

import { z } from 'zod'

export const guestCartHeaderSchema = z.object({
  'x-guest-session-id': z.uuid().optional(),
})

export const addCartItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().positive().max(9999),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const syncCartSchema = z.object({
  items: z.array(addCartItemSchema).max(50),
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative().max(9999),
})

export const cartItemParamsSchema = z.object({
  itemId: z.uuid(),
})

export const couponSchema = z.object({
  code: z.string().trim().min(1).max(100),
})

export const loyaltySchema = z.object({
  points: z.number().int().min(1),
})

export const checkoutSchema = z.object({
  selectedShippingOptionId: z.string().trim().min(1).max(100).optional(),
})

export const cartExpiryJobPayloadSchema = z.object({
  tenantId: z.uuid(),
  cartId: z.uuid(),
})

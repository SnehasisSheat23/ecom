import { z } from 'zod'

export const initiateCheckoutSchema = z
  .object({
    cartId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          variantId: z.string().uuid(),
          quantity: z.number().int().positive(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    guestEmail: z.string().email().optional(),
    shippingAddress: z.record(z.string(), z.unknown()).optional(),
    billingAddress: z.record(z.string(), z.unknown()).optional(),
    couponCode: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.cartId || (data.items && data.items.length > 0), {
    message: 'Either cartId or direct items must be provided',
  })

export const selectShippingSchema = z.object({
  shippingOptionId: z.string().min(1),
})

export const completeCheckoutSchema = z.object({
  paymentMethod: z.string().min(1),
  notes: z.string().max(500).optional(),
})

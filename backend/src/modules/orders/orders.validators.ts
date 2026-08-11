import { z } from 'zod'

export const addressSnapshotSchema = z.object({
  fullName: z.string().min(1).max(255).nullable().optional(),
  label: z.string().min(1).max(50).nullable().optional(),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2),
  phone: z.string().min(6).max(20).nullable().optional(),
})

export const storedAddressSnapshotSchema = addressSnapshotSchema.transform((address) => ({
  ...address,
  line2: address.line2 ?? null,
  phone: address.phone ?? null,
}))

export const shippingMethodSnapshotSchema = z
  .union([
    z.object({
      id: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      estimated_days: z.number().optional(),
      amount: z.number().optional(),
      name: z.string().optional(),
      price: z.number().optional(),
      partner_id: z.string().optional(),
    }),
    z.record(z.string(), z.unknown()),
  ])
  .nullable()
  .transform((val) => {
    if (!val) return null
    const obj = val as Record<string, any>
    return {
      id: String(obj.id || 'standard'),
      label: String(obj.label || obj.name || 'Standard Delivery'),
      description: String(obj.description || 'Standard Delivery'),
      estimated_days: typeof obj.estimated_days === 'number' ? obj.estimated_days : 1,
      amount: typeof obj.amount === 'number' ? obj.amount : (typeof obj.price === 'number' ? obj.price : 0),
      partner_id: obj.partner_id ? String(obj.partner_id) : undefined,
    }
  })

export const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        quantity: z.number().int().positive(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  shippingAddressId: z.uuid().optional(),
  billingAddressId: z.uuid().optional(),
  shippingAddress: addressSnapshotSchema.optional(),
  billingAddress: addressSnapshotSchema.optional(),
  guestEmail: z.string().email().max(255).optional(),
  selectedShippingOptionId: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const orderParamsSchema = z.object({
  id: z.string().min(1),
})

export const orderTrackQuerySchema = z.object({
  token: z.uuid(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
})

export const listOrdersQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  partnerId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'total', 'id']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  customerEmail: z.string().optional(),
})

export const listAdminOrdersQuerySchema = z.object({
  status: z.string().optional(),
  partnerId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'total', 'id']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  customerEmail: z.string().optional(),
  customerId: z.string().optional(),
  timeFilter: z.enum(['today', '7days', '30days', 'all']).optional(),
})

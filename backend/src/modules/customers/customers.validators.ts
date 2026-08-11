import { z } from 'zod'

const passwordSchema = z.string().min(8).max(128)
const emailSchema = z.email().max(255)

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  guestSessionId: z.uuid().optional(),
})

const cartItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().positive(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128).optional(),
  phone: z.string().min(6).max(20).optional(),
  guestSessionId: z.uuid().optional(),
  items: z.array(cartItemSchema).optional(),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
})

export const profileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(6).max(20).nullable().optional(),
  avatarUrl: z.url().max(500).nullable().optional(),
})

export const addressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).optional(),
  phone: z.string().min(6).max(20).nullable().optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
})

export const updateAddressSchema = addressSchema.partial()
export const requestPasswordResetSchema = z.object({ email: emailSchema })
export const confirmPasswordResetSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6),
  newPassword: passwordSchema,
})
export const googleOAuthSchema = z.object({
  supabaseToken: z.string().min(10),
})

export const activeVendorSchema = z.object({
  partnerId: z.uuid().nullable(),
})

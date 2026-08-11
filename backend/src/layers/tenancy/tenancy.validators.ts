import { z } from 'zod'

const slugPattern = /^[a-z0-9-]{3,50}$/

export const businessTypeSchema = z.enum([
  'ECOMMERCE',
  'MARKETPLACE',
  'FULFILLMENT',
  'RESTAURANT',
  'WHOLESALE',
  'BOOKING',
])

const featuresSchema = z.object({
  wishlist: z.boolean(),
  loyalty: z.boolean(),
  reviews: z.boolean(),
  cart_abandonment: z.boolean(),
})

const brandingSchema = z.object({
  primary_color: z.string().min(4).max(32),
  secondary_color: z.string().min(4).max(32),
  logo_url: z.string().url().nullable(),
  favicon_url: z.string().url().nullable(),
  font: z.string().min(1).max(100),
})

const notificationConfigSchema = z.object({
  from_name: z.string().min(1).max(255),
  from_email: z.email(),
})

import type { TenantFullConfig } from './tenancy.types.js'

export const fullConfigSchema: z.ZodType<Partial<TenantFullConfig>> = z
  .object({
    $schemaVersion: z.number().optional(),
    businessType: businessTypeSchema.optional(),
    storefront: z.record(z.string(), z.unknown()).optional() as any,
    business: z.record(z.string(), z.unknown()).optional() as any,
    dashboard: z.record(z.string(), z.unknown()).optional() as any,
    partner: z.record(z.string(), z.unknown()).optional() as any,
    catalog: z.record(z.string(), z.unknown()).optional() as any,
    modules: z.record(z.string(), z.unknown()).optional() as any,
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough() as unknown as z.ZodType<Partial<TenantFullConfig>>

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .regex(slugPattern, 'Slug must be 3-50 chars of lowercase letters, numbers, or hyphens'),
  customDomain: z.string().min(1).max(255).optional().nullable(),
  mode: z.enum(['SINGLE_VENDOR', 'MULTI_VENDOR']).optional(),
  businessType: businessTypeSchema.optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().min(1).max(50).optional(),
  features: featuresSchema.partial().optional(),
  branding: brandingSchema.partial().optional(),
  notificationConfig: notificationConfigSchema.partial().optional(),
  fullConfig: fullConfigSchema.optional(),
})

export const updateTenantSchema = createTenantSchema
  .omit({ slug: true })
  .extend({ slug: z.string().optional() })
  .partial()

export const updateTenantStatusSchema = z.object({
  status: z.enum(['onboarding', 'active', 'suspended']),
})

export const updateTenantConfigSchema = z.object({
  shipping_flat_rate: z.number().int().nonnegative().optional(),
  free_shipping_threshold: z.number().int().nonnegative().nullable().optional(),
  shipping_strategy: z.enum(['flat_rate', 'weight_based', 'vendor_managed', 'carrier_api', 'slot_based', 'distance_based']).optional(),
  earn_rate: z.number().nonnegative().optional(),
  redeem_rate: z.number().positive().optional(),
  cart_abandonment_delay_hours: z.number().int().nonnegative().optional(),
  coupon_loyalty_stacking: z.boolean().optional(),
  return_window_days: z.number().int().positive().optional(),
})

export const updatePaymentConfigSchema = z.object({
  provider: z.enum(['razorpay', 'stripe', 'payu']).optional(),
  credentials: z.record(z.string(), z.string()),
  webhook_secret: z.string().min(1),
  is_test_mode: z.boolean().optional(),
})

export const tenantAdminBodySchema = z.object({
  customerId: z.uuid(),
})

export const tenantAdminParamsSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
})

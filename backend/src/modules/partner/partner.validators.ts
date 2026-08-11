import { z } from 'zod'

export const partnerStatusSchema = z.enum(['onboarding', 'active', 'suspended'])

export const createPartnerSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().min(6).max(20).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  taxId: z.string().max(50).nullable().optional(),
  address: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: partnerStatusSchema.optional(),
})

export const updatePartnerSchema = createPartnerSchema.partial()

export const partnerIdParamsSchema = z.object({
  partnerId: z.uuid(),
})

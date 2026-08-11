import { z } from 'zod'

export const upsertPartnerDeliveryConfigSchema = z.object({
  provider: z.string().min(1).max(50),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    authToken: z.string().optional(),
    baseUrl: z.string().optional(),
    accountId: z.string().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
})

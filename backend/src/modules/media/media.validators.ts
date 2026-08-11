import { z } from 'zod'

export const listMediaFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  partnerId: z.string().uuid().optional(),
})

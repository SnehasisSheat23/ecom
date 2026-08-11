import { z } from 'zod'

export const attributeSchemaFieldValidator = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
})

export const createProductTypeSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(1000).nullable().optional(),
  partnerId: z.string().uuid().nullable().optional(),
  defaultProductType: z.enum(['physical', 'digital']).optional(),
  attributesSchema: z.array(attributeSchemaFieldValidator).optional(),
  isActive: z.boolean().optional(),
})

export const updateProductTypeSchema = createProductTypeSchema.partial()

export const listProductTypesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  partnerId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
})

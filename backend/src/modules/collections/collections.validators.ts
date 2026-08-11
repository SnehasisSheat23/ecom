import { z } from 'zod'

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  displayType: z.enum(['TREE', 'GRID', 'LIST']).optional().default('GRID'),
  sortOrder: z.number().int().optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
  isActive: z.boolean().optional().default(true),
})

export const updateCollectionSchema = createCollectionSchema.partial()

export const collectionQuerySchema = z.object({
  status: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
})

export const assignProductsToCollectionSchema = z.object({
  productIds: z.array(z.string().uuid()),
})

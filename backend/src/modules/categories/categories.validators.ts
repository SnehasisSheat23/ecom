import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  parentId: z.string().uuid().nullable().optional(),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (!val || val.trim() === '' ? null : val)),
  displayType: z.enum(['TREE', 'GRID', 'LIST']).optional().default('TREE'),
  sortOrder: z.number().int().optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
  isActive: z.boolean().optional().default(true),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  h1: z.string().max(255).nullable().optional(),
  h2: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional().default([]),
  translations: z.record(z.string(), z.record(z.string(), z.any())).optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryQuerySchema = z.object({
  parentId: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined
      if (val === 'null' || val === 'none' || val === 'root' || val === '') return null
      return val
    })
    .pipe(z.string().uuid().nullable().optional()),
  status: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
})

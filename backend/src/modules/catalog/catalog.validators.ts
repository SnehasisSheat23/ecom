import { z } from 'zod'

const slugSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

const positiveMoneySchema = z.number().int().min(0)
const nullableIntSchema = z.number().int().nullable()

export const variantPriceSchema = z.object({
  currencyCode: z.string().length(3).transform((val) => val.toUpperCase()),
  price: positiveMoneySchema,
  compareAtPrice: positiveMoneySchema.nullable().optional(),
  costPerItem: z.number().int().min(0).nullable().optional(),
})

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  price: positiveMoneySchema,
  compareAtPrice: positiveMoneySchema.nullable().optional(),
  prices: z.array(variantPriceSchema).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  trackInventory: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
  weightGrams: nullableIntSchema.optional(),
  lengthMm: nullableIntSchema.optional(),
  widthMm: nullableIntSchema.optional(),
  heightMm: nullableIntSchema.optional(),
  costPerItem: z.number().int().min(0).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  countryOfOrigin: z.string().max(100).nullable().optional(),
  hsCode: z.string().max(50).nullable().optional(),
  availableQuantity: z.number().int().optional(),
  allowBackorder: z.boolean().optional(),
})

const productOptionSchema = z.object({
  name: z.string().min(1).max(255),
  values: z.array(z.string().min(1)),
  position: z.number().int().min(0),
})

export const createProductSchema = z.object({
  title: z.string().min(1).max(255),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  shortDescription: z.string().max(500).nullable().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  productType: z.enum(['physical', 'digital']).optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  canonicalUrl: z.url().max(500).nullable().optional(),
  partnerId: z.uuid().nullable().optional(),
  taxClass: z.string().max(50).nullable().optional(),
  vendorCommissionOverride: z.number().min(0).max(100).nullable().optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  categoryIds: z.array(z.uuid()).optional(),
  collectionIds: z.array(z.uuid()).optional(),
  collections: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  translations: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  options: z.array(productOptionSchema).optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantSchema).min(1),
})

export const updateProductSchema = createProductSchema
  .omit({ variants: true })
  .partial()
  .extend({
    categoryIds: z.array(z.uuid()).optional(),
    variants: z.array(variantSchema).optional(),
  })

export const createCategorySchema = z.object({
  parentId: z.uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.url().max(500).nullable().optional(),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()
export const updateVariantSchema = variantSchema.partial()

export const uploadImageMetadataSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().optional(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
  altText: z.string().max(255).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(2500).default(20),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  categorySlug: slugSchema.optional(),
  productTypeId: z.string().uuid().optional(),
  search: z.string().optional(),
  includeDeleted: z.preprocess((val) => val === 'true', z.boolean()).optional(),
  partnerId: z.string().uuid().optional(),
  isOwner: z.preprocess((val) => val === 'true', z.boolean()).optional(),
  hasVendor: z.preprocess((val) => val === 'true', z.boolean()).optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  summary: z.preprocess((val) => val === 'true', z.boolean()).optional(),
})

export const bulkDeleteProductsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  slug: slugSchema.optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.url().max(500).nullable().optional(),
  type: z.enum(['MANUAL', 'AUTOMATED']).optional(),
  rules: z.array(z.record(z.string(), z.unknown())).optional(),
  sortOrder: z.string().optional(),
  isActive: z.boolean().optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  productIds: z.array(z.string().uuid()).optional(),
})

export const updateCollectionSchema = createCollectionSchema.partial()

export const listCollectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : undefined, z.boolean()).optional(),
})



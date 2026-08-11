import type { CatalogActor } from '../../layers/authorization/authorization.service.js'
import type { Category as CatalogCategory } from '../categories/categories.types.js'
import type { Collection as CatalogCollection } from '../collections/collections.types.js'

export type { CatalogActor, CatalogCategory, CatalogCollection }

export type ProductStatus = 'draft' | 'active' | 'archived'
export type ProductType = 'physical' | 'digital'

export interface ProductOption {
  name: string
  values: string[]
  position: number
}

export interface CatalogProduct {
  id: string
  tenantId: string
  partnerId: string
  productTypeId: string | null
  title: string
  slug: string
  description: string | null
  shortDescription: string | null
  status: ProductStatus
  productType: ProductType
  catalogType: 'REGULAR' | 'BUNDLE' | 'COMPONENT'
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  taxClass: string | null
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  vendorCommissionOverride: number | null
  specifications: Record<string, string>
  translations?: Record<string, Record<string, any>>
  options: ProductOption[]
  tags: string[]
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CatalogVariantPrice {
  id: string
  tenantId: string
  variantId: string
  currencyCode: string
  price: number
  compareAtPrice: number | null
  costPerItem: number | null
  createdAt: Date
  updatedAt: Date
}

export interface CatalogVariant {
  id: string
  tenantId: string
  productId: string
  sku: string
  title: string
  price: number
  compareAtPrice: number | null
  prices?: CatalogVariantPrice[]
  attributes: Record<string, string>
  trackInventory: boolean
  position: number
  isDefault: boolean
  weightGrams: number | null
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  costPerItem: number | null
  barcode: string | null
  countryOfOrigin: string | null
  hsCode: string | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CatalogImage {
  id: string
  tenantId: string
  productId: string
  variantId: string | null
  url: string
  storagePath: string | null
  altText: string | null
  position: number
  createdAt: Date
}

export interface PriceHistoryEntry {
  id: string
  tenantId: string
  variantId: string
  oldPrice: number
  newPrice: number
  changedBy: string | null
  changedAt: Date
}

export interface ProductListFilters {
  page?: number
  perPage?: number
  status?: ProductStatus
  categorySlug?: string
  collectionSlug?: string
  includeDeleted?: boolean
  partnerId?: string | null
  productTypeId?: string | null
  search?: string
  hasVendor?: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  isPublic?: boolean
  summary?: boolean
  catalogType?: 'REGULAR' | 'BUNDLE' | 'COMPONENT'
}

export interface PublicProductFilters {
  page?: number
  perPage?: number
  categorySlug?: string
  collectionSlug?: string
  productTypeId?: string | null
}

export interface VariantPriceInput {
  currencyCode: string
  price: number
  compareAtPrice?: number | null
  costPerItem?: number | null
}

export interface VariantInput {
  id?: string
  sku: string
  title: string
  price: number
  compareAtPrice?: number | null
  prices?: VariantPriceInput[]
  attributes?: Record<string, string>
  trackInventory?: boolean
  position?: number
  isDefault?: boolean
  weightGrams?: number | null
  lengthMm?: number | null
  widthMm?: number | null
  heightMm?: number | null
  costPerItem?: number | null
  barcode?: string | null
  countryOfOrigin?: string | null
  hsCode?: string | null
  availableQuantity?: number
  allowBackorder?: boolean
}

export interface CreateProductInput {
  title: string
  slug?: string
  description?: string | null
  shortDescription?: string | null
  status?: ProductStatus
  productType?: ProductType
  productTypeId?: string | null
  catalogType?: 'REGULAR' | 'BUNDLE' | 'COMPONENT'
  metaTitle?: string | null
  metaDescription?: string | null
  canonicalUrl?: string | null
  partnerId?: string | null
  taxClass?: string | null
  vendorCommissionOverride?: number | null
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
  categoryIds?: string[]
  collectionIds?: string[]
  collections?: string[]
  specifications?: Record<string, string>
  translations?: Record<string, Record<string, any>>
  options?: ProductOption[]
  tags?: string[]
  variants: VariantInput[]
}

export interface UpdateProductInput extends Omit<Partial<CreateProductInput>, 'variants'> {
  categoryIds?: string[]
  collectionIds?: string[]
  variants?: VariantInput[]
  collections?: string[]
}

export interface UpdateVariantInput extends Partial<VariantInput> {}

export interface UploadImageInput {
  productId: string
  variantId?: string | null
  filename: string
  contentType: string
  altText?: string | null
  position?: number
  content: Buffer
}

export interface CreateImageRecordInput {
  productId: string
  variantId?: string | null
  mediaId: string
  altText?: string | null
  position?: number
}

export interface CatalogVariantSummary {
  variantId: string
  productId: string
  tenantId: string
  partnerId: string | null
  sku: string
  title: string
  productTitle: string
  price: number
  productType: ProductType
  catalogType: 'REGULAR' | 'BUNDLE' | 'COMPONENT'
  trackInventory: boolean
  isDeleted: boolean
  productStatus: ProductStatus
}

export interface CatalogProductSummary {
  id: string
  tenantId: string
  partnerId: string
  productTypeId: string | null
  title: string
  slug: string
  status: ProductStatus
  productType: ProductType
  catalogType: 'REGULAR' | 'BUNDLE' | 'COMPONENT'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  description: string | null
  shortDescription: string | null
  vendorCommissionOverride: number | null
  specifications: Record<string, string>
  translations?: Record<string, Record<string, any>>
  options: ProductOption[]
  tags: string[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface CatalogProductWithDetails extends CatalogProduct {
  vendorName: string | null
  variants: CatalogVariant[]
  images: CatalogImage[]
  categories: CatalogCategory[]
  collections: CatalogCollection[]
}

export interface CatalogProductSummaryWithDetails extends CatalogProductSummary {
  vendorName: string | null
  variants: CatalogVariant[]
  images: CatalogImage[]
  categories: CatalogCategory[]
  collections: CatalogCollection[]
}

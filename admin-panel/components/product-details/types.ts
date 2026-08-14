export interface VariantPrice {
  currencyCode: string
  price: number | ""
  compareAtPrice?: number | ""
  costPerItem?: number | ""
}

export interface APIVariantPrice {
  id?: string
  currencyCode: string
  price: number
  compareAtPrice?: number | null
  costPerItem?: number | null
}

export interface Variant {
  id?: string
  name: string
  sku: string
  price: number | ""
  compareAtPrice?: number | ""
  costPerItem?: number | ""
  prices?: VariantPrice[]
  barcode?: string
  trackInventory: boolean
  inventory: number | ""
  allowBackorder: boolean
  weightGrams?: number | ""
  countryOfOrigin?: string
  hsCode?: string
  attributes?: Record<string, string>
  isDefault?: boolean
}

export interface APIVariant {
  id?: string
  title?: string
  price: number
  compareAtPrice?: number
  costPerItem?: number
  prices?: APIVariantPrice[]
  sku?: string
  barcode?: string
  trackInventory?: boolean
  availableQuantity?: number
  allowBackorder?: boolean
  weightGrams?: number
  countryOfOrigin?: string
  hsCode?: string
  attributes?: Record<string, string>
  isDefault?: boolean
}

export interface APICollection {
  name: string
}

export interface APICategory {
  id: string
  name: string
}

export interface APISalesChannel {
  name: string
  status: string
  createdAt?: string
}

export interface SEO {
  title: string
  description: string
  keywords?: string
}

export interface PublishingDetail {
  channel: string
  published: boolean
  date?: string
}

export interface ProductImage {
  id: string
  url: string
  variantId: string | null
  position: number
  altText: string | null
}

export interface APIProductImage {
  id: string
  url: string
  variantId?: string | null
  position?: number
  altText?: string | null
}

export interface Product {
  id: string
  image: string
  images?: ProductImage[]
  title: string
  description?: string
  status: "Active" | "Draft" | "Archived"
  inventory: string
  salesChannels: number
  markets: number
  category: string
  categoryArabic?: string
  categoryEnglish?: string
  categoryIds?: string[]
  type: string
  vendor: string
  vendorId?: string | null
  price: number | ""
  compareAtPrice?: number | ""
  costPerItem?: number | ""
  sku?: string
  barcode?: string
  trackQuantity?: boolean
  continueSellingWhenOutOfStock?: boolean
  quantity?: number | ""
  weight?: number | ""
  weightUnit?: string
  countryOfOrigin?: string
  hsCode?: string
  collections?: string[]
  publishingDetails?: PublishingDetail[]
  variants?: Variant[]
  seo?: SEO
  moq?: number | ""
  moqStep?: number | ""
  currency?: string
  arabicTitle?: string
  arabicDescription?: string
  translations?: Record<string, Record<string, any>>
  specifications?: Record<string, string>
  tags?: string[]
}

export interface MediaAsset {
  id: string
  tenantId: string
  vendorId: string | null
  url: string
  storagePath: string | null
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

export interface APIVendor {
  id: string
  name: string
  slug: string
  status: string
}

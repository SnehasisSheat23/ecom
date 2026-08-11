import type { AttributeSchemaField } from './product-type.schema.js'
export type { AttributeSchemaField }

export interface CatalogProductType {
  id: string
  tenantId: string
  partnerId: string | null
  name: string
  slug: string
  description: string | null
  defaultProductType: 'physical' | 'digital'
  attributesSchema: AttributeSchemaField[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateProductTypeInput {
  name: string
  slug?: string
  description?: string | null
  partnerId?: string | null
  defaultProductType?: 'physical' | 'digital'
  attributesSchema?: AttributeSchemaField[]
  isActive?: boolean
}

export interface UpdateProductTypeInput extends Partial<CreateProductTypeInput> {}

export interface ProductTypeQueryFilters {
  page?: number
  perPage?: number
  search?: string
  partnerId?: string | null
  isActive?: boolean
}

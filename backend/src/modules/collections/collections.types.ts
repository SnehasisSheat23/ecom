export type CollectionDisplayType = 'TREE' | 'GRID' | 'LIST'

export interface Collection {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  displayType: CollectionDisplayType
  sortOrder: number
  status: string
  isActive: boolean
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CollectionWithProductCount extends Collection {
  productCount: number
}

export interface CreateCollectionInput {
  name: string
  slug?: string
  description?: string | null
  imageUrl?: string | null
  displayType?: CollectionDisplayType
  sortOrder?: number
  status?: string
  isActive?: boolean
  productIds?: string[]
}

export interface UpdateCollectionInput {
  name?: string
  slug?: string
  description?: string | null
  imageUrl?: string | null
  displayType?: CollectionDisplayType
  sortOrder?: number
  status?: string
  isActive?: boolean
  productIds?: string[]
}

export interface CollectionFilters {
  status?: string
  isActive?: boolean
  search?: string
}

export interface CollectionActorContext {
  userId?: string
  tenantId: string
  isAdmin?: boolean
  isSuperAdmin?: boolean
}

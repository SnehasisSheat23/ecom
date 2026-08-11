export type CategoryDisplayType = 'TREE' | 'GRID' | 'LIST'

export interface Category {
  id: string
  tenantId: string
  parentId: string | null
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  displayType: CategoryDisplayType
  level: number
  sortOrder: number
  status: string
  isActive: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  h1?: string | null
  h2?: string | null
  keywords?: string[]
  translations?: Record<string, Record<string, any>>
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

export interface CreateCategoryInput {
  name: string
  parentId?: string | null
  slug?: string
  description?: string | null
  imageUrl?: string | null
  displayType?: CategoryDisplayType
  sortOrder?: number
  status?: string
  isActive?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  h1?: string | null
  h2?: string | null
  keywords?: string[]
  translations?: Record<string, Record<string, any>>
}

export interface UpdateCategoryInput {
  name?: string
  parentId?: string | null
  slug?: string
  description?: string | null
  imageUrl?: string | null
  displayType?: CategoryDisplayType
  sortOrder?: number
  status?: string
  isActive?: boolean
  metaTitle?: string | null
  metaDescription?: string | null
  h1?: string | null
  h2?: string | null
  keywords?: string[]
  translations?: Record<string, Record<string, any>>
}

export interface CategoryFilters {
  parentId?: string | null
  status?: string
  isActive?: boolean
  search?: string
}

export interface CategoryActorContext {
  userId?: string
  tenantId: string
  isAdmin?: boolean
  isSuperAdmin?: boolean
}

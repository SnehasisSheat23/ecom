export type BlogStatus = 'draft' | 'pending_review' | 'published' | 'rejected'

export interface BlogCategory {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Blog {
  id: string
  tenantId: string
  partnerId: string | null
  categoryId: string | null
  authorId: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImageUrl: string | null
  status: BlogStatus
  isVisible: boolean
  rejectionReason: string | null
  metaTitle: string | null
  metaDescription: string | null
  tags: string[]
  publishedAt: Date | null
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface BlogImage {
  id: string
  tenantId: string
  blogId: string
  url: string
  altText: string | null
  position: number
  createdAt: Date
}

export interface BlogWithDetails extends Blog {
  authorName: string | null
  vendorName: string | null
  categoryName: string | null
  categorySlug: string | null
  images: BlogImage[]
}

export interface CreateBlogCategoryInput {
  name: string
  slug?: string
  description?: string | null
  isVisible?: boolean
}

export interface UpdateBlogCategoryInput extends Partial<CreateBlogCategoryInput> {}

export interface CreateBlogInput {
  title: string
  slug?: string
  categoryId?: string | null
  excerpt?: string | null
  content: string
  coverImageUrl?: string | null
  status?: BlogStatus
  metaTitle?: string | null
  metaDescription?: string | null
  tags?: string[]
}

export interface UpdateBlogInput extends Partial<CreateBlogInput> {}

export interface ApproveBlogInput {
  // intentionally empty — approval sets status + publishedAt automatically
}

export interface RejectBlogInput {
  reason: string
}

export interface BlogListFilters {
  status?: BlogStatus
  partnerId?: string | null
  categoryId?: string | null
  isVisible?: boolean
  tags?: string[]
  page?: number
  perPage?: number
}

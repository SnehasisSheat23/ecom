import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { blogCoverImagePath, blogInlineImagePath } from '../../lib/storage-paths.js'
import type { TenantMode } from '../../layers/tenancy/tenancy.types.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'
import type { StorageProvider } from '../../providers/storage/storage.interface.js'
import { BlogsRepository } from './blogs.repository.js'
import type {
  Blog,
  BlogImage,
  BlogWithDetails,
  CreateBlogInput,
  UpdateBlogInput,
  RejectBlogInput,
  BlogListFilters,
  BlogCategory,
  CreateBlogCategoryInput,
  UpdateBlogCategoryInput,
} from './blogs.types.js'
import type { PaginatedResult } from '../../lib/types.js'
import { slugify } from '../../lib/slug.js'

export class BlogsService {
  constructor(
    private readonly repository: BlogsRepository,
    private readonly storage?: StorageProvider,
  ) {}

  // ─── Categories ────────────────────────────────────────────────

  async createCategory(
    actor: AuthenticatedCustomer,
    input: CreateBlogCategoryInput,
  ): Promise<BlogCategory> {
    this.assertAdmin(actor)
    const slug = slugify(input.slug ?? input.name)
    
    const existing = await this.repository.findCategoryBySlug(actor.tenantId, slug)
    if (existing) {
      throw new AppError('Category with this slug already exists', 409, 'category-slug-conflict')
    }

    return this.repository.createCategory({
      tenantId: actor.tenantId,
      name: input.name,
      slug,
      description: input.description ?? null,
      isVisible: input.isVisible ?? true,
    })
  }

  async updateCategory(
    actor: AuthenticatedCustomer,
    id: string,
    input: UpdateBlogCategoryInput,
  ): Promise<BlogCategory> {
    this.assertAdmin(actor)
    const category = await this.repository.findCategoryById(actor.tenantId, id)
    if (!category) {
      throw new AppError('Category not found', 404, 'category-not-found')
    }

    const next: Record<string, any> = { ...input }
    if (input.slug) {
      const newSlug = slugify(input.slug)
      if (newSlug !== category.slug) {
        const existing = await this.repository.findCategoryBySlug(actor.tenantId, newSlug)
        if (existing && existing.id !== id) {
          throw new AppError('Category with this slug already exists', 409, 'category-slug-conflict')
        }
        next.slug = newSlug
      }
    }

    return this.repository.updateCategory(actor.tenantId, id, next)
  }

  async listCategories(actor: AuthenticatedCustomer, includeHidden = false): Promise<BlogCategory[]> {
    return this.repository.listCategories(actor.tenantId, includeHidden)
  }

  async deleteCategory(actor: AuthenticatedCustomer, id: string): Promise<void> {
    this.assertAdmin(actor)
    // Optional: Check if category is used by any blogs before deleting?
    await this.repository.deleteCategory(actor.tenantId, id)
  }

  // ─── Blogs ────────────────────────────────────────────────────

  /**
   * Dual-mode blog creation:
   * - SINGLE_VENDOR: only admins can create blogs, status is admin-controlled
   * - MULTI_VENDOR:
   *     - Admin can create directly (same as single vendor)
   *     - Vendor creates as 'pending_review', must be approved by admin
   */
  async createBlog(
    actor: AuthenticatedCustomer,
    tenantMode: TenantMode,
    input: CreateBlogInput,
  ): Promise<Blog> {
    const slug = slugify(input.slug ?? input.title)
    if (!slug) {
      throw new AppError('Blog slug is required', 400, 'blog-slug-required')
    }

    // Check slug uniqueness
    const existing = await this.repository.findBySlug(actor.tenantId, slug)
    if (existing) {
      throw new AppError('A blog with this slug already exists', 409, 'blog-slug-conflict')
    }

    const isAdmin = actor.isAdmin || actor.isSuperAdmin

    if (tenantMode === 'SINGLE_VENDOR') {
      // Only admin can create blogs in single-vendor mode
      if (!isAdmin) {
        throw new AppError('Admin access required to create blogs', 403, 'forbidden')
      }

      const status = input.status ?? 'draft'
      return this.repository.createBlog({
        tenantId: actor.tenantId,
        partnerId: null,
        categoryId: input.categoryId ?? null,
        authorId: actor.customerId,
        title: input.title,
        slug,
        excerpt: input.excerpt ?? null,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        status,
        isVisible: true,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        tags: input.tags ?? [],
        publishedAt: status === 'published' ? new Date() : null,
      })
    }

    // MULTI_VENDOR mode
    if (isAdmin) {
      // Admin can still create platform blogs directly
      const status = input.status ?? 'draft'
      return this.repository.createBlog({
        tenantId: actor.tenantId,
        partnerId: null,
        categoryId: input.categoryId ?? null,
        authorId: actor.customerId,
        title: input.title,
        slug,
        excerpt: input.excerpt ?? null,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        status,
        isVisible: true,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        tags: input.tags ?? [],
        publishedAt: status === 'published' ? new Date() : null,
      })
    }

    // Vendor submitting a blog → goes to pending_review
    if (!actor.activePartnerId) {
      throw new AppError('Active vendor context required', 403, 'forbidden')
    }

    this.assertActiveVendorMembership(actor)

    return this.repository.createBlog({
      tenantId: actor.tenantId,
      partnerId: actor.activePartnerId,
      categoryId: input.categoryId ?? null,
      authorId: actor.customerId,
      title: input.title,
      slug,
      excerpt: input.excerpt ?? null,
      content: input.content,
      coverImageUrl: input.coverImageUrl ?? null,
      status: 'pending_review',
      isVisible: false, // not visible until approved
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      tags: input.tags ?? [],
      publishedAt: null,
    })
  }

  // ─── Read ──────────────────────────────────────────────────────

  async getBlog(actor: AuthenticatedCustomer, blogId: string): Promise<BlogWithDetails> {
    const blog = await this.repository.getBlogWithDetails(actor.tenantId, blogId)
    if (!blog || blog.deletedAt) {
      throw new AppError('Blog not found', 404, 'blog-not-found')
    }

    const isAdmin = actor.isAdmin || actor.isSuperAdmin
    const isOwnVendorBlog = blog.partnerId && actor.activePartnerId === blog.partnerId

    // Non-admin, non-vendor-owner can only see published + visible blogs
    if (!isAdmin && !isOwnVendorBlog) {
      if (blog.status !== 'published' || !blog.isVisible) {
        throw new AppError('Blog not found', 404, 'blog-not-found')
      }
    }

    return blog
  }

  async getPublicBlogBySlug(tenantId: string, slug: string): Promise<BlogWithDetails> {
    const blog = await this.repository.getBlogWithDetailsBySlug(tenantId, slug)
    if (!blog || blog.deletedAt) {
      throw new AppError('Blog not found', 404, 'blog-not-found')
    }

    if (blog.status !== 'published' || !blog.isVisible) {
      throw new AppError('Blog not found', 404, 'blog-not-found')
    }

    return blog
  }

  async listPublicBlogs(
    tenantId: string,
    filters: { tag?: string; categorySlug?: string; page?: number; perPage?: number },
  ): Promise<PaginatedResult<BlogWithDetails>> {
    return this.repository.listPublicBlogs(tenantId, filters)
  }

  async listVendorBlogs(
    actor: AuthenticatedCustomer,
    page?: number,
    perPage?: number,
  ): Promise<PaginatedResult<BlogWithDetails>> {
    if (!actor.activePartnerId) {
      throw new AppError('Active vendor context required', 403, 'forbidden')
    }

    this.assertActiveVendorMembership(actor)

    return this.repository.listBlogs(actor.tenantId, {
      partnerId: actor.activePartnerId,
      page,
      perPage,
    })
  }

  async listAdminBlogs(
    actor: AuthenticatedCustomer,
    filters: BlogListFilters,
  ): Promise<PaginatedResult<BlogWithDetails>> {
    this.assertAdmin(actor)
    return this.repository.listBlogs(actor.tenantId, filters)
  }

  // ─── Update ────────────────────────────────────────────────────

  async updateBlog(
    actor: AuthenticatedCustomer,
    blogId: string,
    input: UpdateBlogInput,
  ): Promise<Blog> {
    const blog = await this.requireBlog(actor.tenantId, blogId)
    const isAdmin = actor.isAdmin || actor.isSuperAdmin

    if (!isAdmin) {
      // Vendors can only edit their own blogs that are draft or rejected
      if (blog.partnerId !== actor.activePartnerId) {
        throw new AppError('Forbidden', 403, 'forbidden')
      }
      if (blog.status !== 'draft' && blog.status !== 'rejected') {
        throw new AppError(
          'Only draft or rejected blogs can be edited',
          409,
          'blog-not-editable',
        )
      }
      // Vendor cannot set status directly
      delete input.status
    }

    const next: Record<string, unknown> = { ...input }

    if (input.slug) {
      const newSlug = slugify(input.slug)
      if (newSlug !== blog.slug) {
        const existing = await this.repository.findBySlug(actor.tenantId, newSlug)
        if (existing && existing.id !== blogId) {
          throw new AppError('A blog with this slug already exists', 409, 'blog-slug-conflict')
        }
        next.slug = newSlug
      }
    }

    // If admin sets status to published, stamp publishedAt
    if (input.status === 'published' && blog.status !== 'published') {
      next.publishedAt = new Date()
      next.isVisible = true
    }

    return this.repository.updateBlog(actor.tenantId, blogId, next)
  }

  // ─── Approval Flow ─────────────────────────────────────────────

  async approveBlog(actor: AuthenticatedCustomer, blogId: string): Promise<Blog> {
    this.assertAdmin(actor)
    const blog = await this.requireBlog(actor.tenantId, blogId)

    if (blog.status !== 'pending_review') {
      throw new AppError(
        'Only blogs with pending_review status can be approved',
        409,
        'blog-not-pending',
      )
    }

    return this.repository.updateBlog(actor.tenantId, blogId, {
      status: 'published',
      isVisible: true,
      rejectionReason: null,
      publishedAt: new Date(),
    })
  }

  async rejectBlog(
    actor: AuthenticatedCustomer,
    blogId: string,
    input: RejectBlogInput,
  ): Promise<Blog> {
    this.assertAdmin(actor)
    const blog = await this.requireBlog(actor.tenantId, blogId)

    if (blog.status !== 'pending_review') {
      throw new AppError(
        'Only blogs with pending_review status can be rejected',
        409,
        'blog-not-pending',
      )
    }

    return this.repository.updateBlog(actor.tenantId, blogId, {
      status: 'rejected',
      rejectionReason: input.reason,
    })
  }

  async resubmitBlog(
    actor: AuthenticatedCustomer,
    blogId: string,
    input: UpdateBlogInput,
  ): Promise<Blog> {
    if (!actor.activePartnerId) {
      throw new AppError('Active vendor context required', 403, 'forbidden')
    }

    this.assertActiveVendorMembership(actor)

    const blog = await this.requireBlog(actor.tenantId, blogId)

    if (blog.partnerId !== actor.activePartnerId) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (blog.status !== 'rejected') {
      throw new AppError(
        'Only rejected blogs can be resubmitted',
        409,
        'blog-not-rejected',
      )
    }

    const next: Record<string, unknown> = {
      ...input,
      status: 'pending_review',
      rejectionReason: null,
    }

    if (input.slug) {
      const newSlug = slugify(input.slug)
      if (newSlug !== blog.slug) {
        const existing = await this.repository.findBySlug(actor.tenantId, newSlug)
        if (existing && existing.id !== blogId) {
          throw new AppError('A blog with this slug already exists', 409, 'blog-slug-conflict')
        }
        next.slug = newSlug
      }
    }

    return this.repository.updateBlog(actor.tenantId, blogId, next)
  }

  // ─── Visibility Toggle ─────────────────────────────────────────

  async toggleVisibility(
    actor: AuthenticatedCustomer,
    blogId: string,
    isVisible: boolean,
  ): Promise<Blog> {
    this.assertAdmin(actor)
    await this.requireBlog(actor.tenantId, blogId)
    return this.repository.updateBlog(actor.tenantId, blogId, { isVisible })
  }

  // ─── Soft Delete ───────────────────────────────────────────────

  async deleteBlog(actor: AuthenticatedCustomer, blogId: string): Promise<void> {
    this.assertAdmin(actor)
    await this.requireBlog(actor.tenantId, blogId)
    await this.repository.updateBlog(actor.tenantId, blogId, {
      deletedAt: new Date(),
      isVisible: false,
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async requireBlog(tenantId: string, blogId: string): Promise<Blog> {
    const blog = await this.repository.findById(tenantId, blogId)
    if (!blog || blog.deletedAt) {
      throw new AppError('Blog not found', 404, 'blog-not-found')
    }
    return blog
  }

  private assertAdmin(actor: AuthenticatedCustomer): void {
    if (actor.isSuperAdmin) return
    if (actor.isAdmin) return
    throw new AppError('Admin access required', 403, 'forbidden')
  }

  private assertActiveVendorMembership(actor: AuthenticatedCustomer): void {
    if (!actor.activePartnerId) {
      throw new AppError('Active vendor context required', 403, 'forbidden')
    }

    const membership = actor.partnerMemberships.find(
      (m) => m.partnerId === actor.activePartnerId,
    )
    if (!membership || membership.status !== 'active') {
      throw new AppError('Forbidden', 403, 'forbidden')
    }
  }

  // ─── Image Upload Methods ──────────────────────────────────────

  async uploadCoverImage(
    actor: AuthenticatedCustomer,
    blogId: string,
    file: { filename: string; contentType: string; content: Buffer },
  ): Promise<Blog> {
    const blog = await this.requireBlog(actor.tenantId, blogId)
    this.assertCanEditBlog(actor, blog)

    let coverImageUrl: string = `memory://${file.filename}`
    if (this.storage) {
      const storagePath = blogCoverImagePath(actor.tenantId, blogId, file.filename)
      coverImageUrl = await this.storage.upload(actor.tenantId, storagePath, file.content, file.contentType)
    }

    const updated = await this.repository.updateBlog(actor.tenantId, blogId, { coverImageUrl })
    logger.info({ tenantId: actor.tenantId, blogId }, 'blog cover image uploaded')
    return updated
  }

  async uploadInlineImage(
    actor: AuthenticatedCustomer,
    blogId: string,
    file: { filename: string; contentType: string; content: Buffer; altText?: string | null; position?: number },
  ): Promise<BlogImage> {
    const blog = await this.requireBlog(actor.tenantId, blogId)
    this.assertCanEditBlog(actor, blog)

    let url: string = `memory://${file.filename}`
    if (this.storage) {
      const storagePath = blogInlineImagePath(actor.tenantId, blogId, file.filename)
      url = await this.storage.upload(actor.tenantId, storagePath, file.content, file.contentType)
    }

    const image = await this.repository.createImage({
      tenantId: actor.tenantId,
      blogId,
      url,
      altText: file.altText ?? null,
      position: file.position ?? 0,
    })
    logger.info({ tenantId: actor.tenantId, blogId, imageId: image.id }, 'blog inline image uploaded')
    return image
  }

  async deleteInlineImage(
    actor: AuthenticatedCustomer,
    imageId: string,
  ): Promise<void> {
    // We need to find the image to get the blogId for permission check
    // For now, admin-only for safety
    this.assertAdmin(actor)
    await this.repository.deleteImage(actor.tenantId, imageId)
    logger.info({ tenantId: actor.tenantId, imageId }, 'blog inline image deleted')
  }

  private assertCanEditBlog(actor: AuthenticatedCustomer, blog: Blog): void {
    const isAdmin = actor.isAdmin || actor.isSuperAdmin
    if (isAdmin) return

    if (blog.partnerId && actor.activePartnerId === blog.partnerId) {
      this.assertActiveVendorMembership(actor)
      return
    }

    throw new AppError('Forbidden', 403, 'forbidden')
  }
}

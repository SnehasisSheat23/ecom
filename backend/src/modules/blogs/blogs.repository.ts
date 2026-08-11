import { and, count, desc, eq, isNull, sql, inArray, type SQL } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { blogs, blogImages, blogCategories } from './blogs.schema.js'
import { customers } from '../customers/customers.schema.js'
import { partners } from '../partner/partner.schema.js'
import type {
  Blog,
  BlogImage,
  BlogWithDetails,
  BlogStatus,
  BlogCategory,
} from './blogs.types.js'
import type { PaginatedResult } from '../../lib/types.js'

export class BlogsRepository {
  constructor(private readonly db: Database) {}

  async transaction<T>(callback: (repository: BlogsRepository) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx) => {
      const txRepository = new BlogsRepository(tx as any)
      return await callback(txRepository)
    })
  }

  // --- Categories ---

  async createCategory(input: typeof blogCategories.$inferInsert): Promise<BlogCategory> {
    const [row] = await this.db.insert(blogCategories).values(input).returning()
    return row
  }

  async updateCategory(
    tenantId: string,
    id: string,
    next: Partial<typeof blogCategories.$inferSelect>,
  ): Promise<BlogCategory> {
    const [row] = await this.db
      .update(blogCategories)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(blogCategories.tenantId, tenantId), eq(blogCategories.id, id)))
      .returning()
    return row
  }

  async findCategoryById(tenantId: string, id: string): Promise<BlogCategory | null> {
    const [row] = await this.db
      .select()
      .from(blogCategories)
      .where(and(eq(blogCategories.tenantId, tenantId), eq(blogCategories.id, id)))
      .limit(1)
    return row ?? null
  }

  async findCategoryBySlug(tenantId: string, slug: string): Promise<BlogCategory | null> {
    const [row] = await this.db
      .select()
      .from(blogCategories)
      .where(and(eq(blogCategories.tenantId, tenantId), eq(blogCategories.slug, slug)))
      .limit(1)
    return row ?? null
  }

  async listCategories(tenantId: string, includeHidden = false): Promise<BlogCategory[]> {
    const conditions: SQL[] = [eq(blogCategories.tenantId, tenantId)]
    if (!includeHidden) {
      conditions.push(eq(blogCategories.isVisible, true))
    }

    return this.db
      .select()
      .from(blogCategories)
      .where(and(...conditions))
      .orderBy(blogCategories.name)
  }

  async deleteCategory(tenantId: string, id: string): Promise<void> {
    await this.db
      .delete(blogCategories)
      .where(and(eq(blogCategories.tenantId, tenantId), eq(blogCategories.id, id)))
  }

  // --- Blogs ---

  async createBlog(input: typeof blogs.$inferInsert): Promise<Blog> {
    const [row] = await this.db.insert(blogs).values(input).returning()
    return row
  }

  async updateBlog(
    tenantId: string,
    id: string,
    next: Partial<typeof blogs.$inferSelect>,
  ): Promise<Blog> {
    const [row] = await this.db
      .update(blogs)
      .set({ ...next, updatedAt: new Date() })
      .where(and(eq(blogs.tenantId, tenantId), eq(blogs.id, id)))
      .returning()
    return row
  }

  async findById(tenantId: string, id: string): Promise<Blog | null> {
    const [row] = await this.db
      .select()
      .from(blogs)
      .where(and(eq(blogs.tenantId, tenantId), eq(blogs.id, id)))
      .limit(1)
    return row ?? null
  }

  async findBySlug(tenantId: string, slug: string): Promise<Blog | null> {
    const [row] = await this.db
      .select()
      .from(blogs)
      .where(and(eq(blogs.tenantId, tenantId), eq(blogs.slug, slug)))
      .limit(1)
    return row ?? null
  }

  async getBlogWithDetails(tenantId: string, id: string): Promise<BlogWithDetails | null> {
    const [row] = await this.db
      .select({
        blog: blogs,
        authorName: sql<string>`COALESCE(${customers.firstName}, '') || ' ' || COALESCE(${customers.lastName}, '')`.as(
          'author_name',
        ),
        vendorName: partners.name,
        categoryName: blogCategories.name,
        categorySlug: blogCategories.slug,
      })
      .from(blogs)
      .innerJoin(customers, eq(blogs.authorId, customers.id))
      .leftJoin(partners, eq(blogs.partnerId, partners.id))
      .leftJoin(blogCategories, eq(blogs.categoryId, blogCategories.id))
      .where(and(eq(blogs.tenantId, tenantId), eq(blogs.id, id)))
      .limit(1)

    if (!row) return null

    const images = await this.listImages(tenantId, id)

    return {
      ...row.blog,
      authorName: row.authorName,
      vendorName: row.vendorName,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      images,
    }
  }

  async getBlogWithDetailsBySlug(tenantId: string, slug: string): Promise<BlogWithDetails | null> {
    const [row] = await this.db
      .select({
        blog: blogs,
        authorName: sql<string>`COALESCE(${customers.firstName}, '') || ' ' || COALESCE(${customers.lastName}, '')`.as(
          'author_name',
        ),
        vendorName: partners.name,
        categoryName: blogCategories.name,
        categorySlug: blogCategories.slug,
      })
      .from(blogs)
      .innerJoin(customers, eq(blogs.authorId, customers.id))
      .leftJoin(partners, eq(blogs.partnerId, partners.id))
      .leftJoin(blogCategories, eq(blogs.categoryId, blogCategories.id))
      .where(
        and(
          eq(blogs.tenantId, tenantId),
          eq(blogs.slug, slug),
          isNull(blogs.deletedAt),
        ),
      )
      .limit(1)

    if (!row) return null

    const images = await this.listImages(tenantId, row.blog.id)

    return {
      ...row.blog,
      authorName: row.authorName,
      vendorName: row.vendorName,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      images,
    }
  }

  async listBlogs(
    tenantId: string,
    filters: {
      status?: BlogStatus
      partnerId?: string | null
      categoryId?: string | null
      isVisible?: boolean
      page?: number
      perPage?: number
    },
  ): Promise<PaginatedResult<BlogWithDetails>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions: SQL[] = [eq(blogs.tenantId, tenantId), isNull(blogs.deletedAt)]

    if (filters.status) {
      conditions.push(eq(blogs.status, filters.status))
    }
    if (filters.partnerId !== undefined) {
      if (filters.partnerId === null) {
        conditions.push(isNull(blogs.partnerId))
      } else {
        conditions.push(eq(blogs.partnerId, filters.partnerId))
      }
    }
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === null) {
        conditions.push(isNull(blogs.categoryId))
      } else {
        conditions.push(eq(blogs.categoryId, filters.categoryId))
      }
    }
    if (filters.isVisible !== undefined) {
      conditions.push(eq(blogs.isVisible, filters.isVisible))
    }

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(blogs)
        .where(and(...conditions)),
      this.db
        .select({
          blog: blogs,
          authorName: sql<string>`COALESCE(${customers.firstName}, '') || ' ' || COALESCE(${customers.lastName}, '')`.as(
            'author_name',
          ),
          vendorName: partners.name,
          categoryName: blogCategories.name,
          categorySlug: blogCategories.slug,
        })
        .from(blogs)
        .leftJoin(customers, eq(blogs.authorId, customers.id))
        .leftJoin(partners, eq(blogs.partnerId, partners.id))
        .leftJoin(blogCategories, eq(blogs.categoryId, blogCategories.id))
        .where(and(...conditions))
        .orderBy(desc(blogs.createdAt))
        .limit(perPage)
        .offset(offset),
    ])

    // Fetch images for all blogs in one go
    const blogIds = rows.map((r) => r.blog.id)
    const allImages =
      blogIds.length > 0
        ? await this.db
            .select()
            .from(blogImages)
            .where(
              and(
                eq(blogImages.tenantId, tenantId),
                inArray(blogImages.blogId, blogIds),
              ),
            )
        : []

    const imagesByBlogId = new Map<string, BlogImage[]>()
    for (const img of allImages) {
      const list = imagesByBlogId.get(img.blogId) ?? []
      list.push(img)
      imagesByBlogId.set(img.blogId, list)
    }

    return {
      items: rows.map((r) => ({
        ...r.blog,
        authorName: r.authorName,
        vendorName: r.vendorName,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug,
        images: imagesByBlogId.get(r.blog.id) ?? [],
      })),
      total: totalResult[0]?.total ?? 0,
      page,
      perPage,
    }
  }

  async listPublicBlogs(
    tenantId: string,
    filters: {
      tag?: string
      categorySlug?: string
      page?: number
      perPage?: number
    },
  ): Promise<PaginatedResult<BlogWithDetails>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions: SQL[] = [
      eq(blogs.tenantId, tenantId),
      eq(blogs.status, 'published'),
      eq(blogs.isVisible, true),
      isNull(blogs.deletedAt),
    ]

    if (filters.tag) {
      conditions.push(sql`${blogs.tags} @> ${JSON.stringify([filters.tag])}::jsonb`)
    }
    if (filters.categorySlug) {
      conditions.push(eq(blogCategories.slug, filters.categorySlug))
    }

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(blogs)
        .leftJoin(blogCategories, eq(blogs.categoryId, blogCategories.id))
        .where(and(...conditions)),
      this.db
        .select({
          blog: blogs,
          authorName: sql<string>`COALESCE(${customers.firstName}, '') || ' ' || COALESCE(${customers.lastName}, '')`.as(
            'author_name',
          ),
          vendorName: partners.name,
          categoryName: blogCategories.name,
          categorySlug: blogCategories.slug,
        })
        .from(blogs)
        .leftJoin(customers, eq(blogs.authorId, customers.id))
        .leftJoin(partners, eq(blogs.partnerId, partners.id))
        .leftJoin(blogCategories, eq(blogs.categoryId, blogCategories.id))
        .where(and(...conditions))
        .orderBy(desc(blogs.publishedAt))
        .limit(perPage)
        .offset(offset),
    ])

    const blogIds = rows.map((r) => r.blog.id)
    const allImages =
      blogIds.length > 0
        ? await this.db
            .select()
            .from(blogImages)
            .where(
              and(
                eq(blogImages.tenantId, tenantId),
                inArray(blogImages.blogId, blogIds),
              ),
            )
        : []

    const imagesByBlogId = new Map<string, BlogImage[]>()
    for (const img of allImages) {
      const list = imagesByBlogId.get(img.blogId) ?? []
      list.push(img)
      imagesByBlogId.set(img.blogId, list)
    }

    return {
      items: rows.map((r) => ({
        ...r.blog,
        authorName: r.authorName,
        vendorName: r.vendorName,
        categoryName: r.categoryName,
        categorySlug: r.categorySlug,
        images: imagesByBlogId.get(r.blog.id) ?? [],
      })),
      total: totalResult[0]?.total ?? 0,
      page,
      perPage,
    }
  }

  // --- Blog Images ---

  async createImage(input: typeof blogImages.$inferInsert): Promise<BlogImage> {
    const [row] = await this.db.insert(blogImages).values(input).returning()
    return row
  }

  async listImages(tenantId: string, blogId: string): Promise<BlogImage[]> {
    return this.db
      .select()
      .from(blogImages)
      .where(and(eq(blogImages.tenantId, tenantId), eq(blogImages.blogId, blogId)))
      .orderBy(blogImages.position)
  }

  async deleteImage(tenantId: string, imageId: string): Promise<void> {
    await this.db
      .delete(blogImages)
      .where(and(eq(blogImages.tenantId, tenantId), eq(blogImages.id, imageId)))
  }
}

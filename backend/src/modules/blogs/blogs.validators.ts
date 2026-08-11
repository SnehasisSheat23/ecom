import { z } from 'zod'

export const createBlogCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  isVisible: z.boolean().optional(),
})

export const updateBlogCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  isVisible: z.boolean().optional(),
})

export const createBlogSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(1).max(255).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  excerpt: z.string().max(500).nullable().optional(),
  content: z.string().min(10),
  coverImageUrl: z.string().url().nullable().optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected']).optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const updateBlogSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  excerpt: z.string().max(500).nullable().optional(),
  content: z.string().min(10).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected']).optional(),
  metaTitle: z.string().max(255).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const rejectBlogSchema = z.object({
  reason: z.string().min(5).max(1000),
})

export const toggleVisibilitySchema = z.object({
  isVisible: z.boolean(),
})

export const listBlogsQuerySchema = z.object({
  status: z.enum(['draft', 'pending_review', 'published', 'rejected']).optional(),
  partnerId: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  perPage: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
})

export const publicListBlogsQuerySchema = z.object({
  tag: z.string().optional(),
  categorySlug: z.string().optional(),
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  perPage: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
})

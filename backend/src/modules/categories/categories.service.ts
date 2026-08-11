import type { CacheProvider } from '../../providers/cache/cache.interface.js'
import { AppError } from '../../lib/errors.js'
import { CategoriesRepository } from './categories.repository.js'
import type {
  Category,
  CategoryActorContext,
  CategoryFilters,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './categories.types.js'

export class CategoriesService {
  constructor(
    private repository: CategoriesRepository,
    private cache?: CacheProvider,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  assertCanManageCategories(tenantId: string, actor?: CategoryActorContext): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === tenantId) {
      return
    }

    throw new AppError('Forbidden: Only store admins can manage categories', 403, 'forbidden')
  }

  async createCategory(
    tenantId: string,
    input: CreateCategoryInput,
    actor?: CategoryActorContext,
  ): Promise<Category> {
    this.assertCanManageCategories(tenantId, actor)
    const slug = input.slug || this.slugify(input.name)

    await this.ensureSlugAvailable(tenantId, slug)

    let level = 0
    if (input.parentId) {
      const parent = await this.repository.findById(tenantId, input.parentId)
      if (!parent) {
        throw new AppError('Parent category not found', 404, 'category-parent-not-found')
      }
      level = parent.level + 1
    }

    const category = await this.repository.create(
      tenantId,
      { ...input, slug, level },
      actor?.userId,
    )
    await this.invalidateCaches(tenantId, slug)
    return category
  }

  async updateCategory(
    tenantId: string,
    id: string,
    input: UpdateCategoryInput,
    actor?: CategoryActorContext,
  ): Promise<Category> {
    this.assertCanManageCategories(tenantId, actor)

    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw new AppError('Category not found', 404, 'category-not-found')
    }

    if (input.parentId === id) {
      throw new AppError('Category cannot be its own parent', 400, 'category-cycle')
    }

    let nextSlug = existing.slug
    if (input.slug || input.name) {
      nextSlug = input.slug || this.slugify(input.name || existing.name)
      if (nextSlug !== existing.slug) {
        await this.ensureSlugAvailable(tenantId, nextSlug)
      }
    }

    let nextLevel = existing.level
    if (input.parentId !== undefined && input.parentId !== existing.parentId) {
      if (input.parentId !== null) {
        await this.detectCycle(tenantId, id, input.parentId)
        const parent = await this.repository.findById(tenantId, input.parentId)
        if (!parent) {
          throw new AppError('Parent category not found', 404, 'category-parent-not-found')
        }
        nextLevel = parent.level + 1
      } else {
        nextLevel = 0
      }
    }

    const updated = await this.repository.update(
      tenantId,
      id,
      { ...input, slug: nextSlug, level: nextLevel },
      actor?.userId,
    )
    await this.invalidateCaches(tenantId, existing.slug, updated.slug)
    return updated
  }

  async deleteCategory(tenantId: string, id: string, actor?: CategoryActorContext): Promise<void> {
    this.assertCanManageCategories(tenantId, actor)

    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw new AppError('Category not found', 404, 'category-not-found')
    }

    await this.repository.unsetParentForChildren(tenantId, id, existing.parentId)
    await this.repository.delete(tenantId, id)

    await this.invalidateCaches(tenantId, existing.slug)
  }

  async getCategoryById(tenantId: string, id: string): Promise<Category | null> {
    return this.repository.findById(tenantId, id)
  }

  async getCategoryBySlug(tenantId: string, slug: string): Promise<Category | null> {
    return this.repository.findBySlug(tenantId, slug)
  }

  async listCategories(tenantId: string, filters?: CategoryFilters): Promise<Category[]> {
    return this.repository.findAll(tenantId, filters)
  }

  async getCategoryTree(tenantId: string, includeInactive = false): Promise<CategoryTreeNode[]> {
    const cacheKey = `categories:tree:${tenantId}:${includeInactive}`
    const cached = await this.cache?.get<CategoryTreeNode[]>(cacheKey)
    if (cached) return cached

    const allCategories = await this.repository.findAll(
      tenantId,
      includeInactive ? undefined : { isActive: true },
    )

    const byParent = new Map<string | null, CategoryTreeNode[]>()
    for (const category of allCategories) {
      const node: CategoryTreeNode = { ...category, children: [] }
      const key = category.parentId ?? null
      const list = byParent.get(key) ?? []
      list.push(node)
      byParent.set(key, list)
    }

    const buildSubtree = (parentId: string | null): CategoryTreeNode[] => {
      const children = byParent.get(parentId) ?? []
      return children.map((child) => ({
        ...child,
        children: buildSubtree(child.id),
      }))
    }

    const tree = buildSubtree(null)
    await this.cache?.set(cacheKey, tree, 3600)
    return tree
  }

  private async ensureSlugAvailable(tenantId: string, slug: string): Promise<void> {
    const existing = await this.repository.findBySlug(tenantId, slug)
    if (existing) {
      throw new AppError(`Category slug already exists: ${slug}`, 409, 'category-slug-conflict')
    }
  }

  private async detectCycle(tenantId: string, categoryId: string, targetParentId: string): Promise<void> {
    let currentId: string | null = targetParentId
    const visited = new Set<string>()

    while (currentId) {
      if (currentId === categoryId) {
        throw new AppError('Category cycle detected', 400, 'category-cycle')
      }
      if (visited.has(currentId)) {
        break
      }
      visited.add(currentId)
      const parentCat: Category | null = await this.repository.findById(tenantId, currentId)
      currentId = parentCat ? parentCat.parentId : null
    }
  }

  private async invalidateCaches(tenantId: string, ...slugs: string[]): Promise<void> {
    if (!this.cache) return
    await this.cache.delete(`categories:tree:${tenantId}:true`)
    await this.cache.delete(`categories:tree:${tenantId}:false`)
    for (const slug of slugs) {
      if (slug) {
        await this.cache.delete(`categories:slug:${tenantId}:${slug}`)
      }
    }
  }
}

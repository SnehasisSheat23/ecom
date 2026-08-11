import type { CacheProvider } from '../../providers/cache/cache.interface.js'
import { AppError } from '../../lib/errors.js'
import { CollectionsRepository } from './collections.repository.js'
import type {
  Collection,
  CollectionActorContext,
  CollectionFilters,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collections.types.js'

export class CollectionsService {
  constructor(
    private repository: CollectionsRepository,
    private cache?: CacheProvider,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  assertCanManageCollections(tenantId: string, actor?: CollectionActorContext): void {
    if (!actor) {
      throw new AppError('Forbidden', 403, 'forbidden')
    }

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === tenantId) {
      return
    }

    throw new AppError('Forbidden: Only store admins can manage collections', 403, 'forbidden')
  }

  async createCollection(
    tenantId: string,
    input: CreateCollectionInput,
    actor?: CollectionActorContext,
  ): Promise<Collection> {
    this.assertCanManageCollections(tenantId, actor)
    const slug = input.slug || this.slugify(input.name)

    await this.ensureSlugAvailable(tenantId, slug)

    const collection = await this.repository.create(
      tenantId,
      { ...input, slug },
      actor?.userId,
    )
    await this.invalidateCaches(tenantId, slug)
    return collection
  }

  async updateCollection(
    tenantId: string,
    id: string,
    input: UpdateCollectionInput,
    actor?: CollectionActorContext,
  ): Promise<Collection> {
    this.assertCanManageCollections(tenantId, actor)

    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw new AppError('Collection not found', 404, 'collection-not-found')
    }

    let nextSlug = existing.slug
    if (input.slug || input.name) {
      nextSlug = input.slug || this.slugify(input.name || existing.name)
      if (nextSlug !== existing.slug) {
        await this.ensureSlugAvailable(tenantId, nextSlug)
      }
    }

    const updated = await this.repository.update(
      tenantId,
      id,
      { ...input, slug: nextSlug },
      actor?.userId,
    )
    await this.invalidateCaches(tenantId, existing.slug, updated.slug)
    return updated
  }

  async deleteCollection(tenantId: string, id: string, actor?: CollectionActorContext): Promise<void> {
    this.assertCanManageCollections(tenantId, actor)

    const existing = await this.repository.findById(tenantId, id)
    if (!existing) {
      throw new AppError('Collection not found', 404, 'collection-not-found')
    }

    await this.repository.delete(tenantId, id)
    await this.invalidateCaches(tenantId, existing.slug)
  }

  async getCollectionById(tenantId: string, id: string): Promise<Collection | null> {
    return this.repository.findById(tenantId, id)
  }

  async getCollectionBySlug(tenantId: string, slug: string): Promise<Collection | null> {
    return this.repository.findBySlug(tenantId, slug)
  }

  async listCollections(tenantId: string, filters?: CollectionFilters): Promise<Collection[]> {
    return this.repository.findAll(tenantId, filters)
  }

  private async ensureSlugAvailable(tenantId: string, slug: string): Promise<void> {
    const existing = await this.repository.findBySlug(tenantId, slug)
    if (existing) {
      throw new AppError(`Collection slug already exists: ${slug}`, 409, 'collection-slug-conflict')
    }
  }

  private async invalidateCaches(tenantId: string, ...slugs: string[]): Promise<void> {
    if (!this.cache) return
    await this.cache.delete(`collections:list:${tenantId}`)
    for (const slug of slugs) {
      if (slug) {
        await this.cache.delete(`collections:slug:${tenantId}:${slug}`)
      }
    }
  }
}

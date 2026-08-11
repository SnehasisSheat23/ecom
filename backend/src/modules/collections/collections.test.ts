import { describe, expect, it, beforeEach } from 'vitest'
import { CollectionsService } from './collections.service.js'
import { CollectionsRepository } from './collections.repository.js'

describe('CollectionsService', () => {
  let repository: CollectionsRepository
  let service: CollectionsService
  const mockStorage = new Map<string, any>()

  const mockDb: any = {}

  beforeEach(() => {
    mockStorage.clear()
    repository = new CollectionsRepository(mockDb)
    service = new CollectionsService(repository)
  })

  it('creates marketing collection with GRID displayType', async () => {
    const adminActor = { tenantId: 'tenant-1', isAdmin: true, userId: 'admin-1' }

    repository.findBySlug = async () => null
    repository.create = async (tenantId, input, actorId) => {
      const col: any = {
        id: 'col-1',
        tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        displayType: input.displayType ?? 'GRID',
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? 'ACTIVE',
        isActive: input.isActive ?? true,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockStorage.set(col.id, col)
      return col
    }

    const created = await service.createCollection('tenant-1', { name: 'Summer Sale' }, adminActor)

    expect(created.name).toBe('Summer Sale')
    expect(created.slug).toBe('summer-sale')
    expect(created.displayType).toBe('GRID')
    expect(created.createdBy).toBe('admin-1')
  })
})

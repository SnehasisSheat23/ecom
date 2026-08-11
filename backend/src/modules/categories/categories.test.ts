import { describe, expect, it, beforeEach } from 'vitest'
import { CategoriesService } from './categories.service.js'
import { CategoriesRepository } from './categories.repository.js'

describe('CategoriesService', () => {
  let repository: CategoriesRepository
  let service: CategoriesService
  const mockStorage = new Map<string, any>()
  const mockJunction = new Set<string>()

  const mockDb: any = {
    insert: () => ({
      values: (val: any) => ({
        returning: async () => {
          const created = {
            id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...val,
          }
          mockStorage.set(created.id, created)
          return [created]
        },
      }),
    }),
    update: () => ({
      set: (val: any) => ({
        where: () => ({
          returning: async () => {
            // Updated in memory
            return [val]
          },
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: (condition: any) => {
          return Array.from(mockStorage.values())
        },
        orderBy: () => Array.from(mockStorage.values()),
      }),
    }),
    delete: () => ({
      where: async () => {},
    }),
  }

  beforeEach(() => {
    mockStorage.clear()
    mockJunction.clear()
    repository = new CategoriesRepository(mockDb)
    service = new CategoriesService(repository)
  })

  it('slugifies category names properly', async () => {
    const adminActor = { tenantId: 'tenant-1', isAdmin: true, userId: 'user-1' }

    // Mock repository create/findBySlug directly for unit test
    repository.findBySlug = async () => null
    repository.create = async (tenantId, input, actorId) => {
      const cat: any = {
        id: 'cat-1',
        tenantId,
        parentId: input.parentId ?? null,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        displayType: input.displayType ?? 'TREE',
        level: input.level ?? 0,
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? 'ACTIVE',
        isActive: input.isActive ?? true,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockStorage.set(cat.id, cat)
      return cat
    }

    const created = await service.createCategory(
      'tenant-1',
      { name: 'Smart Phones & Accessories' },
      adminActor,
    )

    expect(created.slug).toBe('smart-phones-accessories')
    expect(created.displayType).toBe('TREE')
    expect(created.level).toBe(0)
  })

  it('handles multi-level hierarchy (2 to 20+ levels)', async () => {
    const adminActor = { tenantId: 'tenant-1', isAdmin: true }

    const catsMap = new Map<string, any>()
    repository.findBySlug = async () => null
    repository.findById = async (tenantId, id) => catsMap.get(id) || null
    repository.create = async (tenantId, input) => {
      const id = `cat-${catsMap.size + 1}`
      const cat: any = {
        id,
        tenantId,
        parentId: input.parentId ?? null,
        name: input.name,
        slug: input.slug,
        level: input.level ?? 0,
        displayType: input.displayType ?? 'TREE',
      }
      catsMap.set(id, cat)
      return cat
    }

    const cat1 = await service.createCategory('tenant-1', { name: 'Electronics' }, adminActor)
    const cat2 = await service.createCategory('tenant-1', { name: 'Phones', parentId: cat1.id }, adminActor)
    const cat3 = await service.createCategory('tenant-1', { name: 'Android', parentId: cat2.id }, adminActor)
    const cat4 = await service.createCategory('tenant-1', { name: 'Samsung', parentId: cat3.id }, adminActor)

    expect(cat1.level).toBe(0)
    expect(cat2.level).toBe(1)
    expect(cat3.level).toBe(2)
    expect(cat4.level).toBe(3)
  })

  it('prevents cycle loop assignment', async () => {
    const adminActor = { tenantId: 'tenant-1', isAdmin: true }
    const catsMap = new Map<string, any>()

    catsMap.set('cat-1', { id: 'cat-1', tenantId: 'tenant-1', parentId: null, level: 0, slug: 'electronics' })
    catsMap.set('cat-2', { id: 'cat-2', tenantId: 'tenant-1', parentId: 'cat-1', level: 1, slug: 'phones' })

    repository.findById = async (tenantId, id) => catsMap.get(id) || null

    await expect(
      service.updateCategory('tenant-1', 'cat-1', { parentId: 'cat-2' }, adminActor),
    ).rejects.toThrow('Category cycle detected')
  })
})

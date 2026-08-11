import { describe, expect, it, vi } from 'vitest'
import type { CatalogActor } from '../../../layers/authorization/authorization.service.js'
import type { ProductTypeRepository } from './product-type.repository.js'
import { ProductTypeService } from './product-type.service.js'
import type { CatalogProductType } from './product-type.types.js'

const typeFixture: CatalogProductType = {
  id: 'pt-1',
  tenantId: 'tenant-1',
  partnerId: null,
  name: 'Cakes',
  slug: 'cakes',
  description: 'Custom baked cakes',
  defaultProductType: 'physical',
  attributesSchema: [
    { key: 'flavour', label: 'Flavour', type: 'select', options: ['Chocolate', 'Vanilla'], required: false },
  ],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const adminActor: CatalogActor = {
  customerId: 'admin-1',
  tenantId: 'tenant-1',
  partnerMemberships: [],
  activePartnerId: null,
  email: 'admin@example.com',
  isAdmin: true,
  isSuperAdmin: false,
}

const vendorActor: CatalogActor = {
  customerId: 'vendor-1',
  tenantId: 'tenant-1',
  partnerMemberships: [{ partnerId: 'vendor-1', role: 'staff', status: 'active' }],
  activePartnerId: 'vendor-1',
  email: 'vendor@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const foreignVendorActor: CatalogActor = {
  customerId: 'vendor-2',
  tenantId: 'tenant-1',
  partnerMemberships: [{ partnerId: 'vendor-2', role: 'staff', status: 'active' }],
  activePartnerId: 'vendor-2',
  email: 'vendor2@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const buildMockRepository = () =>
  ({
    createProductType: vi.fn().mockResolvedValue(typeFixture),
    updateProductType: vi.fn().mockResolvedValue(typeFixture),
    deleteProductType: vi.fn().mockResolvedValue(true),
    findById: vi.fn().mockResolvedValue(typeFixture),
    findBySlug: vi.fn().mockResolvedValue(null),
    listProductTypes: vi.fn().mockResolvedValue({ items: [typeFixture], total: 1, page: 1, perPage: 20 }),
  }) as unknown as ProductTypeRepository

describe('ProductTypeService', () => {
  it('allows store admin to create tenant global product type', async () => {
    const repo = buildMockRepository()
    const service = new ProductTypeService(repo)

    const created = await service.createProductType({ name: 'Cakes' }, 'tenant-1', adminActor)

    expect(created.name).toBe('Cakes')
    expect(repo.createProductType).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ name: 'Cakes', partnerId: null, slug: 'cakes' }),
    )
  })

  it('allows vendor staff to create vendor custom product type', async () => {
    const repo = buildMockRepository()
    const service = new ProductTypeService(repo)

    await service.createProductType({ name: 'Bonsai Plants' }, 'tenant-1', vendorActor)

    expect(repo.createProductType).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ name: 'Bonsai Plants', partnerId: 'vendor-1', slug: 'bonsai-plants' }),
    )
  })

  it('blocks non-admin vendor staff from creating tenant global product type', async () => {
    const repo = buildMockRepository()
    const service = new CatalogProductTypeServiceWrapper(repo)

    // Vendor staff attempting to pass partnerId = null explicitly is forced to their activePartnerId
    await service.createProductType({ name: 'Global Flowers', partnerId: null }, 'tenant-1', vendorActor)

    expect(repo.createProductType).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ partnerId: 'vendor-1' }),
    )
  })

  it('blocks vendor staff from modifying another vendor custom product type', async () => {
    const repo = buildMockRepository()
    vi.mocked(repo.findById).mockResolvedValue({ ...typeFixture, partnerId: 'vendor-1' })
    const service = new ProductTypeService(repo)

    await expect(
      service.updateProductType('pt-1', { name: 'Hacked' }, 'tenant-1', foreignVendorActor),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('rejects creation when slug conflicts', async () => {
    const repo = buildMockRepository()
    vi.mocked(repo.findBySlug).mockResolvedValue(typeFixture)
    const service = new ProductTypeService(repo)

    await expect(
      service.createProductType({ name: 'Cakes' }, 'tenant-1', adminActor),
    ).rejects.toMatchObject({ code: 'product-type-slug-conflict' })
  })
})

class CatalogProductTypeServiceWrapper extends ProductTypeService {}

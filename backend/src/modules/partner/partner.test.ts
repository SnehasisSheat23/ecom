import { describe, expect, it, vi } from 'vitest'

import type { AuthenticatedCustomer } from '../customers/customers.types.js'
import { PartnerService } from './partner.service.js'
import type { PartnerRepository } from './partner.repository.js'
import type { Partner } from './partner.types.js'

const tenantAdmin: AuthenticatedCustomer = {
  customerId: 'cust-admin',
  tenantId: 'tenant-1',
  partnerMemberships: [],
  activePartnerId: null,
  email: 'admin@example.com',
  isAdmin: true,
  isSuperAdmin: false,
}

const partnerFixture: Partner = {
  id: 'partner-1',
  tenantId: 'tenant-1',
  name: 'Partner One',
  slug: 'partner-one',
  status: 'active',
  email: 'partner@example.com',
  phone: null,
  description: null,
  logoUrl: null,
  taxId: null,
  address: null,
  metadata: {},
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const buildRepository = () => {
  const repository = {
    createPartner: vi.fn().mockResolvedValue(partnerFixture),
    listPartners: vi.fn().mockResolvedValue({ items: [partnerFixture], page: 1, perPage: 20, total: 1 }),
    findPartnerById: vi.fn().mockResolvedValue(partnerFixture),
    findPartnerBySlug: vi.fn().mockResolvedValue(null),
    updatePartner: vi.fn().mockResolvedValue(partnerFixture),
    softDeletePartner: vi.fn(),
  }

  return repository as unknown as PartnerRepository
}

describe('PartnerService', () => {
  it('creates partner with auto-generated slug', async () => {
    const repository = buildRepository()
    const service = new PartnerService(repository)

    const result = await service.createPartner('tenant-1', { name: 'Partner One' }, tenantAdmin)

    expect(repository.createPartner).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ name: 'Partner One', slug: 'partner-one' }))
    expect(result).toEqual(partnerFixture)
  })

  it('lists partners for tenant admin', async () => {
    const repository = buildRepository()
    const service = new PartnerService(repository)

    const result = await service.listPartners('tenant-1', tenantAdmin, { page: 1, perPage: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('partner-1')
  })
})

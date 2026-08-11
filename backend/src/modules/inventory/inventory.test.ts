import { describe, expect, it, vi } from 'vitest'

import type { InventoryReleaseJobScheduler } from './inventory.jobs.js'
import { InventoryService } from './inventory.service.js'
import type { InventoryRepository } from './inventory.repository.js'
import type { InventoryRecord } from './inventory.types.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'

const inventoryFixture: InventoryRecord = {
  id: 'inv-1',
  tenantId: 'tenant-1',
  partnerId: 'vendor-1',
  variantId: 'variant-1',
  quantityAvailable: 5,
  quantityReserved: 0,
  quantitySold: 0,
  allowBackorder: false,
  lowStockThreshold: 2,
  locationId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const vendorActor: AuthenticatedCustomer = {
  customerId: 'cust-1',
  tenantId: 'tenant-1',
  partnerMemberships: [{ partnerId: 'vendor-1', role: 'staff', status: 'active' }],
  activePartnerId: 'vendor-1',
  email: 'vendor@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const buildRepository = (initial: Partial<InventoryRecord> = {}) => {
  const state: InventoryRecord = { ...inventoryFixture, ...initial }
  const repository = {
    transaction: vi.fn().mockImplementation(async (callback) => callback(repository)),
    findByVariantIdForUpdate: vi.fn().mockImplementation(async () => ({ ...state })),
    findByVariantId: vi.fn().mockImplementation(async () => ({ ...state })),
    updateStock: vi.fn().mockImplementation(async (_tenantId, _inventoryId, next) => {
      Object.assign(state, next, { updatedAt: new Date() })
      return { ...state }
    }),
    insertHistory: vi.fn(),
    listInventory: vi.fn().mockResolvedValue({ items: [{ ...state }], page: 1, perPage: 20, total: 1 }),
    listHistory: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 50, total: 0 }),
    createInventoryRecord: vi.fn().mockImplementation(async (_tenantId, input) => ({
      ...state,
      variantId: input.variantId,
      quantityAvailable: input.quantityAvailable ?? 0,
      quantityReserved: 0,
      quantitySold: 0,
      allowBackorder: input.allowBackorder ?? false,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      locationId: input.locationId ?? null,
    })),
  } as unknown as InventoryRepository

  return { repository, state }
}

describe('InventoryService', () => {
  it('reserves stock and schedules a release job', async () => {
    const { repository, state } = buildRepository()
    const scheduler: InventoryReleaseJobScheduler = {
      upsertReleaseJob: vi.fn(),
      removeReleaseJob: vi.fn(),
    }
    const service = new InventoryService(repository, scheduler)

    await service.reserve('variant-1', 2, '00000000-0000-0000-0000-000000000111', 'tenant-1')

    expect(state.quantityAvailable).toBe(3)
    expect(state.quantityReserved).toBe(2)
    expect(vi.mocked(repository.insertHistory)).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'reserved', delta: -2 }),
    )
    expect(vi.mocked(scheduler.upsertReleaseJob)).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: 'tenant:tenant-1:inventory-release',
        jobName: 'inventory.release',
      }),
    )
  })

  it('rejects reserve when stock is insufficient and backorder is disabled', async () => {
    const { repository } = buildRepository({ quantityAvailable: 1, allowBackorder: false })
    const service = new InventoryService(repository)

    await expect(
      service.reserve('variant-1', 2, '00000000-0000-0000-0000-000000000111', 'tenant-1'),
    ).rejects.toMatchObject({ code: 'insufficient-stock' })
  })

  it('clamps release to reserved quantity', async () => {
    const { repository, state } = buildRepository({ quantityAvailable: 1, quantityReserved: 1 })
    const scheduler: InventoryReleaseJobScheduler = {
      upsertReleaseJob: vi.fn(),
      removeReleaseJob: vi.fn(),
    }
    const service = new InventoryService(repository, scheduler)

    await service.release('variant-1', 5, '00000000-0000-0000-0000-000000000111', 'tenant-1')

    expect(state.quantityAvailable).toBe(2)
    expect(state.quantityReserved).toBe(0)
    expect(vi.mocked(repository.insertHistory)).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'released', delta: 1 }),
    )
    expect(vi.mocked(scheduler.removeReleaseJob)).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: 'tenant:tenant-1:inventory-release',
        jobName: 'inventory.release',
      }),
    )
  })

  it('supports direct sell paths without a prior reservation', async () => {
    const { repository, state } = buildRepository({ quantityAvailable: 4, quantityReserved: 0 })
    const scheduler: InventoryReleaseJobScheduler = {
      upsertReleaseJob: vi.fn(),
      removeReleaseJob: vi.fn(),
    }
    const service = new InventoryService(repository, scheduler)

    await service.permanentDecrement(
      'variant-1',
      2,
      '00000000-0000-0000-0000-000000000222',
      'tenant-1',
      '00000000-0000-0000-0000-000000000111',
    )

    expect(state.quantityAvailable).toBe(2)
    expect(state.quantityReserved).toBe(0)
    expect(state.quantitySold).toBe(2)
    expect(vi.mocked(scheduler.removeReleaseJob)).toHaveBeenCalled()
  })

  it('restores sold quantity on cancellation', async () => {
    const { repository, state } = buildRepository({ quantityAvailable: 1, quantitySold: 3 })
    const service = new InventoryService(repository)

    await service.restoreOnCancellation(
      'variant-1',
      2,
      '00000000-0000-0000-0000-000000000333',
      'tenant-1',
    )

    expect(state.quantityAvailable).toBe(3)
    expect(state.quantitySold).toBe(1)
  })

  it('manual adjustments update available stock and log history', async () => {
    const { repository, state } = buildRepository({ quantityAvailable: 10 })
    const service = new InventoryService(repository)

    const result = await service.adjustStock('variant-1', { delta: -3 }, 'tenant-1')

    expect(result.quantityAvailable).toBe(7)
    expect(state.quantityAvailable).toBe(7)
    expect(vi.mocked(repository.insertHistory)).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'manual_adjust', delta: -3 }),
    )
  })

  it('emits low-stock once when crossing below the threshold', async () => {
    const { repository } = buildRepository({ quantityAvailable: 3, lowStockThreshold: 2 })
    const events: EventPublisher = {
      publish: vi.fn(),
    }
    const service = new InventoryService(repository, undefined, events)

    await service.adjustStock('variant-1', { delta: -1, reason: 'damaged stock' }, 'tenant-1')
    await service.adjustStock('variant-1', { delta: -1, reason: 'cycle count' }, 'tenant-1')

    expect(vi.mocked(events.publish)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(events.publish)).toHaveBeenCalledWith(
      'inventory.low_stock',
      expect.objectContaining({
        variantId: 'variant-1',
        adjustmentReason: 'damaged stock',
      }),
    )
  })

  it('skips stale scheduled releases when no reservation remains', async () => {
    const { repository, state } = buildRepository({ quantityAvailable: 3, quantityReserved: 0 })
    const scheduler: InventoryReleaseJobScheduler = {
      upsertReleaseJob: vi.fn(),
      removeReleaseJob: vi.fn(),
    }
    const service = new InventoryService(repository, scheduler)

    await service.handleScheduledRelease({
      tenantId: 'tenant-1',
      variantId: 'variant-1',
      quantity: 2,
      cartId: '00000000-0000-0000-0000-000000000111',
    })

    expect(state.quantityAvailable).toBe(3)
    expect(vi.mocked(repository.insertHistory)).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'released' }),
    )
    expect(vi.mocked(scheduler.removeReleaseJob)).not.toHaveBeenCalled()
  })

  it('creates initial tracked inventory rows', async () => {
    const { repository } = buildRepository()
    const service = new InventoryService(repository)

    const result = await service.createInventoryForTrackedVariant('tenant-1', {
      variantId: 'variant-2',
      partnerId: 'vendor-1',
      quantityAvailable: 8,
      allowBackorder: true,
    })

    expect(vi.mocked(repository.createInventoryRecord)).toHaveBeenCalledWith('tenant-1', {
      variantId: 'variant-2',
      partnerId: 'vendor-1',
      quantityAvailable: 8,
      allowBackorder: true,
    })
    expect(result.quantityAvailable).toBe(8)
  })

  it('blocks getStock for a different vendor', async () => {
    const { repository } = buildRepository({ partnerId: 'vendor-2' })
    const service = new InventoryService(repository)

    await expect(service.getStock('variant-1', 'tenant-1', vendorActor)).rejects.toMatchObject({
      code: 'forbidden',
    })
  })
})

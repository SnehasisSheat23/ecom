import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ActivityLogService } from './activity-log.service.js'
import { ActivityLogRepository } from './activity-log.repository.js'

describe('ActivityLogService & Repository Edge Cases', () => {
  let mockRepository: any
  let mockAuthService: any
  let service: ActivityLogService

  beforeEach(() => {
    mockRepository = {
      createLog: vi.fn(),
      listLogs: vi.fn(),
      listLogsForEntity: vi.fn(),
      listLogsByActor: vi.fn(),
    }

    mockAuthService = {
      assertSameTenant: vi.fn(),
      assertTenantAdmin: vi.fn(),
    }

    service = new ActivityLogService(mockRepository, mockAuthService)
  })

  describe('record() & recordAsync() Edge Cases', () => {
    it('records log with full details and enforces tenant isolation when actor is provided', async () => {
      const mockLog = {
        id: 'log-1',
        tenantId: 'tenant-1',
        entityType: 'ORDER',
        entityId: 'order-1',
        actorType: 'DELIVERY_PARTNER',
        actorId: 'driver-1',
        actorName: 'Rider Rahul',
        eventType: 'DELIVERY_OUT_FOR_DELIVERY',
        title: 'Out for Delivery',
        description: 'Picked up from dark store',
        metadata: { awb: '12345' },
        createdAt: new Date(),
      }

      mockRepository.createLog.mockResolvedValue(mockLog)

      const actor = { tenantId: 'tenant-1', customerId: 'admin-1' } as any

      const result = await service.record(
        'tenant-1',
        {
          entityType: 'ORDER',
          entityId: 'order-1',
          actorType: 'DELIVERY_PARTNER',
          actorId: 'driver-1',
          actorName: 'Rider Rahul',
          eventType: 'DELIVERY_OUT_FOR_DELIVERY',
          title: 'Out for Delivery',
          description: 'Picked up from dark store',
          metadata: { awb: '12345' },
        },
        actor
      )

      expect(mockAuthService.assertSameTenant).toHaveBeenCalledWith(actor, 'tenant-1')
      expect(mockRepository.createLog).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
        entityType: 'ORDER',
        entityId: 'order-1',
        actorType: 'DELIVERY_PARTNER',
        actorId: 'driver-1',
      }))
      expect(result).toEqual(mockLog)
    })

    it('records log without actor when called internally by system', async () => {
      const mockLog = { id: 'log-2', tenantId: 'tenant-1', entityType: 'SYSTEM' }
      mockRepository.createLog.mockResolvedValue(mockLog)

      const result = await service.record('tenant-1', {
        entityType: 'INVENTORY',
        entityId: 'inv-1',
        eventType: 'STOCK_AUTO_RELEASED',
        title: 'Stock Auto Released',
      })

      expect(mockAuthService.assertSameTenant).not.toHaveBeenCalled()
      expect(mockRepository.createLog).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
        entityType: 'INVENTORY',
        eventType: 'STOCK_AUTO_RELEASED',
      }))
      expect(result).toEqual(mockLog)
    })

    it('recordAsync() silently catches DB errors and returns null', async () => {
      mockRepository.createLog.mockRejectedValue(new Error('DB Timeout'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await service.recordAsync('tenant-1', {
        entityType: 'PRODUCT',
        entityId: 'prod-1',
        eventType: 'PRICE_UPDATE',
        title: 'Price Changed',
      })

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ActivityLog] Failed to record log for tenant tenant-1:'),
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('recordAsync() handles non-Error thrown objects safely', async () => {
      mockRepository.createLog.mockRejectedValue('String exception')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await service.recordAsync('tenant-1', {
        entityType: 'SETTINGS',
        entityId: 'sett-1',
        eventType: 'TAX_UPDATED',
        title: 'Tax Config Changed',
      })

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('getEntityTimeline() Edge Cases', () => {
    it('fetches timeline for entity with pagination params', async () => {
      const mockTimeline = {
        items: [{ id: 'log-1', entityType: 'PRODUCT', entityId: 'prod-1' }],
        total: 1,
        page: 2,
        perPage: 10,
      }
      mockRepository.listLogsForEntity.mockResolvedValue(mockTimeline)
      const actor = { tenantId: 'tenant-1' } as any

      const result = await service.getEntityTimeline('tenant-1', 'PRODUCT', 'prod-1', actor, 2, 10)

      expect(mockAuthService.assertSameTenant).toHaveBeenCalledWith(actor, 'tenant-1')
      expect(mockRepository.listLogsForEntity).toHaveBeenCalledWith('tenant-1', 'PRODUCT', 'prod-1', 2, 10)
      expect(result).toEqual(mockTimeline)
    })
  })

  describe('getActorActivityHistory() & listLogs() Edge Cases', () => {
    it('fetches history for a specific actor (staff or delivery partner)', async () => {
      const mockHistory = {
        items: [{ id: 'log-1', actorId: 'staff-42' }],
        total: 1,
        page: 1,
        perPage: 50,
      }
      mockRepository.listLogsByActor.mockResolvedValue(mockHistory)
      const actor = { tenantId: 'tenant-1' } as any

      const result = await service.getActorActivityHistory('tenant-1', 'staff-42', actor)

      expect(mockAuthService.assertSameTenant).toHaveBeenCalledWith(actor, 'tenant-1')
      expect(mockRepository.listLogsByActor).toHaveBeenCalledWith('tenant-1', 'staff-42', 1, 50)
      expect(result).toEqual(mockHistory)
    })

    it('lists logs with multiple filter options', async () => {
      const mockList = {
        items: [{ id: 'log-10' }],
        total: 1,
        page: 1,
        perPage: 20,
      }
      mockRepository.listLogs.mockResolvedValue(mockList)
      const actor = { tenantId: 'tenant-1' } as any

      const filters = {
        entityType: 'ORDER' as const,
        entityId: 'order-99',
        actorId: 'driver-1',
        eventType: 'DELIVERY_COMPLETED',
        page: 1,
        perPage: 20,
      }

      const result = await service.listLogs('tenant-1', filters, actor)

      expect(mockAuthService.assertSameTenant).toHaveBeenCalledWith(actor, 'tenant-1')
      expect(mockRepository.listLogs).toHaveBeenCalledWith('tenant-1', filters)
      expect(result).toEqual(mockList)
    })
  })

  describe('Repository Unit Testing (Query Builder Edge Cases)', () => {
    it('correctly defaults values in repository createLog when optional fields are missing', async () => {
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 'log-100',
                tenantId: 't-1',
                entityType: 'ORDER',
                entityId: 'o-1',
                actorType: 'SYSTEM',
                actorId: null,
                actorName: null,
                eventType: 'ORDER_CREATED',
                title: 'Order Created',
                description: null,
                metadata: {},
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      } as any

      const repo = new ActivityLogRepository(mockDb)
      const result = await repo.createLog('t-1', {
        entityType: 'ORDER',
        entityId: 'o-1',
        eventType: 'ORDER_CREATED',
        title: 'Order Created',
      })

      expect(result.actorType).toBe('SYSTEM')
      expect(result.actorId).toBeNull()
      expect(result.actorName).toBeNull()
      expect(result.description).toBeNull()
      expect(result.metadata).toEqual({})
    })
  })
})

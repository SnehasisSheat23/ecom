import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import {
  createInventoryReleaseJob,
  type InventoryReleaseJobPayload,
  type InventoryReleaseJobScheduler,
} from './inventory.jobs.js'
import { InventoryRepository } from './inventory.repository.js'
import type {
  InventoryHistoryEntry,
  CreateInventoryInput,
  InventoryAdjustmentInput,
  InventoryHistoryFilters,
  InventoryListFilters,
  InventoryRecord,
  PaginatedInventoryHistoryResult,
  PaginatedInventoryResult,
} from './inventory.types.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'

export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly releaseScheduler?: InventoryReleaseJobScheduler,
    private readonly events?: EventPublisher,
  ) {}

  async reserve(variantId: string, quantity: number, cartId: string, tenantId: string): Promise<void> {
    this.assertPositiveQuantity(quantity)

    const payload = { tenantId, variantId, quantity, cartId }
    const record = await this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, tenantId, variantId)

      if (!current.allowBackorder && current.quantityAvailable < quantity) {
        throw new AppError('Insufficient stock', 409, 'insufficient-stock')
      }

      const next = await repository.updateStock(tenantId, current.id, {
        quantityAvailable: current.quantityAvailable - quantity,
        quantityReserved: current.quantityReserved + quantity,
      })
      await repository.insertHistory({
        tenantId,
        partnerId: current.partnerId,
        variantId,
        delta: -quantity,
        reason: 'reserved',
        cartId,
      })

      return next
    })

    if (this.releaseScheduler) {
      await this.releaseScheduler.upsertReleaseJob(createInventoryReleaseJob(payload))
    }
    await this.emitLowStockIfNeeded(null, record)
  }

  async release(variantId: string, quantity: number, cartId: string, tenantId: string): Promise<void> {
    this.assertPositiveQuantity(quantity)

    const payload = { tenantId, variantId, quantity, cartId }
    await this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, tenantId, variantId)
      const releasable = Math.min(quantity, current.quantityReserved)

      if (releasable < quantity) {
        logger.warn(
          { tenantId, variantId, requestedQuantity: quantity, reservedQuantity: current.quantityReserved },
          'inventory release quantity exceeded reserved stock; clamping release',
        )
      }

      if (releasable === 0) {
        return
      }

      await repository.updateStock(tenantId, current.id, {
        quantityAvailable: current.quantityAvailable + releasable,
        quantityReserved: current.quantityReserved - releasable,
      })
      await repository.insertHistory({
        tenantId,
        partnerId: current.partnerId,
        variantId,
        delta: releasable,
        reason: 'released',
        cartId,
      })
    })

    if (this.releaseScheduler) {
      await this.releaseScheduler.removeReleaseJob(createInventoryReleaseJob(payload))
    }
  }

  async permanentDecrement(
    variantId: string,
    quantity: number,
    orderId: string,
    tenantId: string,
    cartId?: string,
  ): Promise<void> {
    this.assertPositiveQuantity(quantity)

    await this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, tenantId, variantId)
      const reservedToConsume = Math.min(current.quantityReserved, quantity)

      await repository.updateStock(tenantId, current.id, {
        quantityReserved: current.quantityReserved - reservedToConsume,
        quantityAvailable:
          current.quantityAvailable - Math.max(quantity - reservedToConsume, 0),
        quantitySold: current.quantitySold + quantity,
      })
      await repository.insertHistory({
        tenantId,
        variantId,
        delta: -quantity,
        reason: 'sold',
        orderId,
      })
    })

    if (this.releaseScheduler && cartId) {
      await this.releaseScheduler.removeReleaseJob(
        createInventoryReleaseJob({
          tenantId,
          variantId,
          quantity,
          cartId,
        }),
      )
    }
  }

  async restoreOnCancellation(
    variantId: string,
    quantity: number,
    orderId: string,
    tenantId: string,
  ): Promise<void> {
    this.assertPositiveQuantity(quantity)

    await this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, tenantId, variantId)

      await repository.updateStock(tenantId, current.id, {
        quantityAvailable: current.quantityAvailable + quantity,
        quantitySold: Math.max(current.quantitySold - quantity, 0),
      })
      await repository.insertHistory({
        tenantId,
        variantId,
        delta: quantity,
        reason: 'restored',
        orderId,
      })
    })
  }

  async adjustStock(
    variantId: string,
    input: InventoryAdjustmentInput,
    tenantId: string,
    actor?: AuthenticatedCustomer,
  ): Promise<InventoryRecord> {
    this.assertNonZeroDelta(input.delta)

    const { previous, next } = await this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, tenantId, variantId)
      this.assertCanManageInventory(current, actor)
      const updated = await repository.updateStock(tenantId, current.id, {
        quantityAvailable: current.quantityAvailable + input.delta,
      })

      await repository.insertHistory({
        tenantId,
        partnerId: current.partnerId,
        variantId,
        delta: input.delta,
        reason: 'manual_adjust',
      })

      return { previous: current, next: updated }
    })

    await this.emitLowStockIfNeeded(previous, next, input.reason)
    return next
  }

  async getStock(
    variantId: string,
    tenantId: string,
    actor?: AuthenticatedCustomer,
  ): Promise<InventoryRecord> {
    const row = await this.repository.findByVariantId(tenantId, variantId)
    if (!row) {
      throw new AppError('Tracked variant inventory row missing', 500, 'inventory-row-missing')
    }

    this.assertCanManageInventory(row, actor)
    return row
  }

  async listInventory(
    tenantId: string,
    filters: InventoryListFilters = {},
    actor?: AuthenticatedCustomer,
  ): Promise<PaginatedInventoryResult> {
    const scopedFilters =
      actor && !actor.isAdmin && !actor.isSuperAdmin && actor.activePartnerId
        ? { ...filters, partnerId: actor.activePartnerId }
        : filters

    return this.repository.listInventory(tenantId, scopedFilters)
  }

  async listHistory(
    variantId: string,
    tenantId: string,
    filters: InventoryHistoryFilters = {},
    actor?: AuthenticatedCustomer,
  ): Promise<PaginatedInventoryHistoryResult> {
    await this.getStock(variantId, tenantId, actor)
    return this.repository.listHistory(tenantId, variantId, filters)
  }

  async handleScheduledRelease(payload: InventoryReleaseJobPayload): Promise<void> {
    const released = await this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, payload.tenantId, payload.variantId)
      const releasable = Math.min(payload.quantity, current.quantityReserved)

      if (releasable === 0) {
        logger.info(
          {
            tenantId: payload.tenantId,
            variantId: payload.variantId,
            cartId: payload.cartId,
            quantity: payload.quantity,
          },
          'inventory scheduled release skipped because no reservation remained',
        )
        return false
      }

      await repository.updateStock(payload.tenantId, current.id, {
        quantityAvailable: current.quantityAvailable + releasable,
        quantityReserved: current.quantityReserved - releasable,
      })
      await repository.insertHistory({
        tenantId: payload.tenantId,
        partnerId: current.partnerId,
        variantId: payload.variantId,
        delta: releasable,
        reason: 'released',
        cartId: payload.cartId,
      })
      return true
    })

    if (released && this.releaseScheduler) {
      await this.releaseScheduler.removeReleaseJob(createInventoryReleaseJob(payload))
    }
  }

  async createInventoryForTrackedVariant(
    tenantId: string,
    input: CreateInventoryInput,
  ): Promise<InventoryRecord> {
    return this.repository.createInventoryRecord(tenantId, input)
  }

  async updateStock(
    tenantId: string,
    variantId: string,
    next: Partial<Pick<InventoryRecord, 'quantityAvailable' | 'allowBackorder'>>,
  ): Promise<InventoryRecord> {
    return this.repository.transaction(async (repository) => {
      const current = await this.requireLockedRecord(repository, tenantId, variantId)
      const updated = await repository.updateStock(tenantId, current.id, next)
      
      if (next.quantityAvailable !== undefined && next.quantityAvailable !== current.quantityAvailable) {
        await repository.insertHistory({
          tenantId,
          partnerId: current.partnerId,
          variantId,
          delta: next.quantityAvailable - current.quantityAvailable,
          reason: 'manual_adjust',
        })
      }
      
      return updated
    })
  }

  private async requireLockedRecord(
    repository: InventoryRepository,
    tenantId: string,
    variantId: string,
  ): Promise<InventoryRecord> {
    let current = await repository.findByVariantIdForUpdate(tenantId, variantId)
    if (!current) {
      const partnerId = await repository.getPartnerIdForVariant(tenantId, variantId)
      current = await repository.createInventoryRecord(tenantId, {
        variantId,
        partnerId,
        quantityAvailable: 0,
        allowBackorder: true,
      })
    }

    return current
  }

  private assertPositiveQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError('Quantity must be a positive integer', 400, 'invalid-quantity')
    }
  }

  private assertNonZeroDelta(delta: number): void {
    if (!Number.isInteger(delta) || delta === 0) {
      throw new AppError('Delta must be a non-zero integer', 400, 'invalid-delta')
    }
  }

  private async emitLowStockIfNeeded(
    previous: InventoryRecord | null,
    record: InventoryRecord,
    adjustmentReason?: string,
  ): Promise<void> {
    if (record.quantityAvailable > record.lowStockThreshold) {
      return
    }

    if (previous && previous.quantityAvailable <= previous.lowStockThreshold) {
      return
    }

    logger.warn(
      {
        tenantId: record.tenantId,
        variantId: record.variantId,
        quantityAvailable: record.quantityAvailable,
        lowStockThreshold: record.lowStockThreshold,
        adjustmentReason: adjustmentReason ?? null,
      },
      'inventory low stock threshold reached',
    )
    await this.events?.publish('inventory.low_stock', {
      tenantId: record.tenantId,
      variantId: record.variantId,
      quantityAvailable: record.quantityAvailable,
      lowStockThreshold: record.lowStockThreshold,
      adjustmentReason: adjustmentReason ?? null,
    })
  }

  private assertCanManageInventory(
    record: Pick<InventoryRecord, 'tenantId' | 'partnerId'>,
    actor?: AuthenticatedCustomer,
  ): void {
    if (!actor) {
      return
    }

    if (actor.isSuperAdmin) {
      return
    }

    if (actor.isAdmin && actor.tenantId === record.tenantId) {
      return
    }

    if (actor.activePartnerId && record.partnerId === actor.activePartnerId) {
      return
    }

    throw new AppError('Forbidden', 403, 'forbidden')
  }
}

import { AuthorizationService } from '../../layers/authorization/authorization.service.js'
import type { PaginatedResult } from '../../lib/types.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'
import type { ActivityLogRepository } from './activity-log.repository.js'
import type {
  ActivityLog,
  ActivityLogFilters,
  RecordActivityLogInput,
} from './activity-log.types.js'

export class ActivityLogService {
  private readonly auth: AuthorizationService

  constructor(
    private readonly repository: ActivityLogRepository,
    authService?: AuthorizationService
  ) {
    this.auth = authService ?? new AuthorizationService()
  }

  /**
   * Asynchronously records an activity log entry without throwing errors.
   * Safe for non-blocking / fire-and-forget logging.
   */
  async recordAsync(tenantId: string, input: RecordActivityLogInput): Promise<ActivityLog | null> {
    try {
      return await this.repository.createLog(tenantId, input)
    } catch (err) {
      console.error(`[ActivityLog] Failed to record log for tenant ${tenantId}:`, err)
      return null
    }
  }

  /**
   * Synchronously records an activity log entry (will throw on DB failure).
   */
  async record(
    tenantId: string,
    input: RecordActivityLogInput,
    actor?: AuthenticatedCustomer
  ): Promise<ActivityLog> {
    if (actor) {
      this.auth.assertSameTenant(actor, tenantId)
    }
    return this.repository.createLog(tenantId, input)
  }

  /**
   * Fetches audit history timeline for a specific entity (Order, Product, Delivery, etc.).
   */
  async getEntityTimeline(
    tenantId: string,
    entityType: ActivityLogFilters['entityType'],
    entityId: string,
    actor: AuthenticatedCustomer,
    page = 1,
    perPage = 50
  ): Promise<PaginatedResult<ActivityLog>> {
    this.auth.assertSameTenant(actor, tenantId)
    return this.repository.listLogsForEntity(tenantId, entityType, entityId, page, perPage)
  }

  /**
   * Fetches audit activity history performed by a specific actor (Staff member, partner, driver, etc.).
   */
  async getActorActivityHistory(
    tenantId: string,
    actorId: string,
    actor: AuthenticatedCustomer,
    page = 1,
    perPage = 50
  ): Promise<PaginatedResult<ActivityLog>> {
    this.auth.assertSameTenant(actor, tenantId)
    return this.repository.listLogsByActor(tenantId, actorId, page, perPage)
  }

  /**
   * Lists logs based on filters.
   */
  async listLogs(
    tenantId: string,
    filters: ActivityLogFilters,
    actor: AuthenticatedCustomer
  ): Promise<PaginatedResult<ActivityLog>> {
    this.auth.assertSameTenant(actor, tenantId)
    return this.repository.listLogs(tenantId, filters)
  }
}

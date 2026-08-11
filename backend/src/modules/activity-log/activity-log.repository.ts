import { and, count, desc, eq, type SQL } from 'drizzle-orm'

import type { Database } from '../../lib/db.js'
import type { PaginatedResult } from '../../lib/types.js'
import { activityLogs } from './activity-log.schema.js'
import type {
  ActivityLog,
  ActivityLogFilters,
  RecordActivityLogInput,
} from './activity-log.types.js'

export class ActivityLogRepository {
  constructor(private readonly db: Database) {}

  async createLog(tenantId: string, input: RecordActivityLogInput): Promise<ActivityLog> {
    const [row] = await this.db
      .insert(activityLogs)
      .values({
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        actorType: input.actorType ?? 'SYSTEM',
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        eventType: input.eventType,
        title: input.title,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
      })
      .returning()

    return row as ActivityLog
  }

  async listLogs(
    tenantId: string,
    filters: ActivityLogFilters
  ): Promise<PaginatedResult<ActivityLog>> {
    const page = Math.max(1, filters.page ?? 1)
    const perPage = Math.max(1, Math.min(100, filters.perPage ?? 20))
    const offset = (page - 1) * perPage

    const conditions: SQL[] = [eq(activityLogs.tenantId, tenantId)]

    if (filters.entityType) {
      conditions.push(eq(activityLogs.entityType, filters.entityType))
    }

    if (filters.entityId) {
      conditions.push(eq(activityLogs.entityId, filters.entityId))
    }

    if (filters.actorId) {
      conditions.push(eq(activityLogs.actorId, filters.actorId))
    }

    if (filters.eventType) {
      conditions.push(eq(activityLogs.eventType, filters.eventType))
    }

    const whereClause = and(...conditions)

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(activityLogs)
      .where(whereClause)

    const items = await this.db
      .select()
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(perPage)
      .offset(offset)

    const totalCount = Number(total)

    return {
      items: items as ActivityLog[],
      total: totalCount,
      page,
      perPage,
    }
  }

  async listLogsForEntity(
    tenantId: string,
    entityType: ActivityLogFilters['entityType'],
    entityId: string,
    page = 1,
    perPage = 50
  ): Promise<PaginatedResult<ActivityLog>> {
    return this.listLogs(tenantId, {
      entityType,
      entityId,
      page,
      perPage,
    })
  }

  async listLogsByActor(
    tenantId: string,
    actorId: string,
    page = 1,
    perPage = 50
  ): Promise<PaginatedResult<ActivityLog>> {
    return this.listLogs(tenantId, {
      actorId,
      page,
      perPage,
    })
  }
}

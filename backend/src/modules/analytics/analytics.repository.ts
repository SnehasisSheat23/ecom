import { and, desc, eq, sql, sum, count, gte } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { orders } from '../orders/orders.schema.js'
import { partners } from '../partner/partner.schema.js'
import { tenantStats } from '../../layers/tenancy/tenancy.schema.js'

export class AnalyticsRepository {
  constructor(private readonly db: Database) {}

  /**
   * Get platform-wide stats for Admin with time granularity
   */
  async getAdminDashboardStats(tenantId: string) {
    const now = new Date()
    const today = new Date(now)
    today.setUTCHours(0, 0, 0, 0)
    
    const weekStart = new Date(now)
    weekStart.setUTCDate(now.getUTCDate() - now.getUTCDay())
    weekStart.setUTCHours(0, 0, 0, 0)
    
    const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)

    const orderStats = await this.db
      .select({
        monthRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${monthStart} THEN ${orders.total} ELSE 0 END), 0)`,
        monthOrders: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.createdAt} >= ${monthStart} THEN 1 ELSE NULL END), 0)`,
        weekRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${weekStart} THEN ${orders.total} ELSE 0 END), 0)`,
        weekOrders: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.createdAt} >= ${weekStart} THEN 1 ELSE NULL END), 0)`,
        dayRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${today} THEN ${orders.total} ELSE 0 END), 0)`,
        dayOrders: sql<number>`COALESCE(COUNT(CASE WHEN ${orders.createdAt} >= ${today} THEN 1 ELSE NULL END), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.status, 'CONFIRMED')))
      .then(res => res[0])

    const ledgerStats = {
      monthCommission: 0,
      weekCommission: 0,
      dayCommission: 0,
    }

    const [allTimeStats] = await this.db
      .select()
      .from(tenantStats)
      .where(eq(tenantStats.tenantId, tenantId))
      .limit(1)

    return {
      day: {
        revenue: Number(orderStats?.dayRevenue || 0),
        orders: Number(orderStats?.dayOrders || 0),
        commission: Number(ledgerStats?.dayCommission || 0),
      },
      week: {
        revenue: Number(orderStats?.weekRevenue || 0),
        orders: Number(orderStats?.weekOrders || 0),
        commission: Number(ledgerStats?.weekCommission || 0),
      },
      month: {
        revenue: Number(orderStats?.monthRevenue || 0),
        orders: Number(orderStats?.monthOrders || 0),
        commission: Number(ledgerStats?.monthCommission || 0),
      },
      allTime: {
        revenue: allTimeStats?.totalRevenue || 0,
        orders: allTimeStats?.totalOrders || 0,
        commission: allTimeStats?.totalCommission || 0,
        vendors: allTimeStats?.totalVendors || 0,
        customers: allTimeStats?.totalCustomers || 0,
      },
      debugTenantId: tenantId,
      serverTime: now.toISOString()
    }
  }

  /**
   * Get vendor-specific stats with time granularity
   */
  async getVendorDashboardStats(tenantId: string, partnerId: string) {
    const emptyStat = { gross: 0, net: 0, commission: 0, orders: 0 }
    return {
      day: emptyStat,
      week: emptyStat,
      month: emptyStat,
      allTime: emptyStat,
      debugVendorId: partnerId,
      serverTime: new Date().toISOString()
    }
  }

  /**
   * Fast, paginated "Lite" order list
   */
  async getRecentOrdersLite(tenantId: string, options: { partnerId?: string; page: number; perPage: number }) {
    const offset = (options.page - 1) * options.perPage
    const filters = [eq(orders.tenantId, tenantId)]
    
    if (options.partnerId) {
      filters.push(eq(orders.partnerId, options.partnerId))
    }

    return this.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        guestEmail: orders.guestEmail,
        customerId: orders.customerId,
      })
      .from(orders)
      .where(and(...filters))
      .limit(options.perPage)
      .offset(offset)
      .orderBy(desc(orders.createdAt))
  }

  /**
   * Get a summary of all partners with their financial status
   */
  async getAdminVendorSummaries(tenantId: string) {
    return this.db
      .select({
        partnerId: partners.id,
        vendorName: partners.name,
        totalSalesGross: sql<number>`0`,
        totalCommission: sql<number>`0`,
        totalNetSales: sql<string>`'0'`,
        orderCount: sql<number>`0`,
      })
      .from(partners)
      .where(eq(partners.tenantId, tenantId))
  }

  /**
   * Master ledger for global audit
   */
  async getGlobalLedger(tenantId: string, page: number, perPage: number) {
    return []
  }

  /**
   * Partner-specific ledger for auditing
   */
  async getVendorLedger(tenantId: string, partnerId: string, page: number, perPage: number) {
    return []
  }
}

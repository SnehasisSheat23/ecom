import { AnalyticsRepository } from './analytics.repository.js'

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  async getAdminDashboard(tenantId: string) {
    const stats = await this.repository.getAdminDashboardStats(tenantId)

    return {
      stats,
      serverTime: new Date().toISOString()
    }
  }

  async getAdminVendors(tenantId: string) {
    return this.repository.getAdminVendorSummaries(tenantId)
  }

  async getAdminLedger(tenantId: string, page = 1, perPage = 20) {
    return this.repository.getGlobalLedger(tenantId, page, perPage)
  }

  async getVendorDashboard(tenantId: string, partnerId: string) {
    const stats = await this.repository.getVendorDashboardStats(tenantId, partnerId)
    const ledger = await this.repository.getVendorLedger(tenantId, partnerId, 1, 10)

    return {
      stats,
      ledger,
      serverTime: new Date().toISOString()
    }
  }
}

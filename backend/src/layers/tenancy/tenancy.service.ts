import { AppError } from '../../lib/errors.js'
import type { Customer } from '../../modules/customers/customers.types.js'
import type { CustomerRepository } from '../../modules/customers/customers.repository.js'
import type { CacheProvider } from '../../providers/cache/cache.interface.js'
import type {
  CreateTenantInput,
  PaginatedResult,
  Tenant,
  TenantConfig,
  TenantContext,
  TenantPaymentConfig,
  TenantStats,
  TenantStatus,
  TenantWithConfig,
  UpdatePaymentConfigInput,
  UpdateTenantConfigInput,
  UpdateTenantInput,
} from './tenancy.types.js'
import type { TenancyRepository } from './tenancy.repository.js'

export class TenancyService {
  constructor(
    private readonly repository: TenancyRepository,
    private readonly customers?: CustomerRepository,
    private readonly cache?: CacheProvider,
  ) {}

  async resolveByHostname(hostname: string): Promise<TenantContext | null> {
    const cached = await this.cache?.get<TenantContext>(`tenant:host:${hostname}`)
    if (cached) return cached

    const tenant =
      (await this.repository.findByCustomDomain(hostname)) ||
      (await this.resolveBySubdomain(hostname))

    if (!tenant) return null

    const context = await this.getTenantContext(tenant.id)
    await this.cache?.set(`tenant:host:${hostname}`, context, 300) // 5 min cache
    return context
  }

  async resolveBySlug(slug: string): Promise<TenantContext | null> {
    const tenant = await this.repository.findBySlug(slug)
    if (!tenant) return null
    return this.getTenantContext(tenant.id)
  }

  async createTenant(data: CreateTenantInput): Promise<Tenant> {
    const tenant = await this.repository.create(data)
    await this.incrementStats(tenant.id, { totalVendors: 0, totalCustomers: 0 }) // Init stats
    return tenant
  }

  async updateTenant(tenantId: string, data: UpdateTenantInput): Promise<Tenant> {
    await this.ensureTenantExists(tenantId)
    const current = await this.repository.findById(tenantId)
    if (data.slug && data.slug !== current?.slug) {
      throw new AppError('Tenant slug is immutable', 400, 'tenant-slug-immutable')
    }

    const updated = await this.repository.update(tenantId, data)
    await this.invalidateTenantCacheById(tenantId)
    return updated
  }

  async updateStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
    await this.ensureTenantExists(tenantId)
    const current = await this.getTenant(tenantId)
    if (status === 'active' && !current.payment) {
      throw new AppError('Payment config required for activation', 409, 'tenant-payment-missing')
    }
    const updated = await this.repository.update(tenantId, { status })
    await this.invalidateTenantCache(current.tenant)
    return updated
  }

  async updateConfig(tenantId: string, data: UpdateTenantConfigInput): Promise<TenantConfig> {
    await this.ensureTenantExists(tenantId)
    const result = await this.repository.updateConfig(tenantId, data)
    await this.invalidateTenantCacheById(tenantId)
    return result
  }

  async updatePaymentConfig(
    tenantId: string,
    data: UpdatePaymentConfigInput,
  ): Promise<TenantPaymentConfig> {
    await this.ensureTenantExists(tenantId)
    const result = await this.repository.updatePaymentConfig(tenantId, data)
    await this.invalidateTenantCacheById(tenantId)
    return result
  }

  async listTenants(page = 1, perPage = 20): Promise<PaginatedResult<Tenant>> {
    return this.repository.list(page, perPage)
  }

  async getTenant(tenantId: string): Promise<TenantWithConfig> {
    const tenant = await this.repository.findWithConfig(tenantId)
    if (!tenant) {
      throw new AppError('Tenant not found', 404, 'tenant-not-found')
    }

    return {
      ...tenant,
      payment: tenant.payment
        ? {
            provider: tenant.payment.provider,
            credentials: {},
            is_test_mode: tenant.payment.is_test_mode,
          }
        : null,
    }
  }

  async getTenantContext(tenantId: string): Promise<TenantContext> {
    const tenant = await this.repository.findWithConfig(tenantId)
    if (!tenant) {
      throw new AppError('Tenant not found', 404, 'tenant-not-found')
    }

    return this.toTenantContext(tenant)
  }

  async getTenantPaymentConfig(tenantId: string): Promise<TenantPaymentConfig | null> {
    await this.ensureTenantExists(tenantId)
    return this.repository.findPaymentConfig(tenantId)
  }

  async grantTenantAdmin(tenantId: string, customerId: string): Promise<Customer> {
    const customer = await this.updateTenantAdminStatus(tenantId, customerId, true)
    if (!customer) {
      throw new AppError('Customer not found for tenant', 404, 'customer-not-found')
    }
    return customer
  }

  async revokeTenantAdmin(tenantId: string, customerId: string): Promise<Customer> {
    const customer = await this.updateTenantAdminStatus(tenantId, customerId, false)
    if (!customer) {
      throw new AppError('Customer not found for tenant', 404, 'customer-not-found')
    }
    return customer
  }

  async incrementStats(tenantId: string, stats: Partial<Omit<TenantStats, 'tenantId' | 'updatedAt'>>): Promise<void> {
    return this.repository.incrementStats(tenantId, stats)
  }

  async decrementStats(tenantId: string, stats: Partial<Omit<TenantStats, 'tenantId' | 'updatedAt'>>): Promise<void> {
    return this.repository.decrementStats(tenantId, stats)
  }

  private async ensureTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.repository.findById(tenantId)
    if (!tenant) {
      throw new AppError('Tenant not found', 404, 'tenant-not-found')
    }
  }

  private async updateTenantAdminStatus(
    tenantId: string,
    customerId: string,
    isAdmin: boolean,
  ): Promise<Customer | null> {
    await this.ensureTenantExists(tenantId)
    if (!this.customers) {
      throw new AppError('Customer repository not configured', 500, 'customer-repository-missing')
    }

    return this.customers.updateAdminStatus(tenantId, customerId, isAdmin)
  }

  private async resolveBySubdomain(hostname: string): Promise<Tenant | null> {
    if (!hostname.endsWith('.nexuscommerce.app')) {
      return null
    }

    const slug = hostname.replace(/\.nexuscommerce\.app$/, '')
    if (!slug || slug.includes('.')) {
      return null
    }

    return this.repository.findBySlug(slug)
  }

  private async invalidateTenantCacheById(tenantId: string): Promise<void> {
    const tenant = await this.repository.findById(tenantId)
    if (tenant) await this.invalidateTenantCache(tenant)
  }

  private async invalidateTenantCache(tenant: Tenant): Promise<void> {
    const keys = [`tenant:host:${tenant.slug}.nexuscommerce.app`]
    if (tenant.customDomain) keys.push(`tenant:host:${tenant.customDomain}`)
    await Promise.all(keys.map((k) => this.cache?.delete(k)))
  }

  private toTenantContext(tenant: TenantWithConfig): TenantContext {
    return {
      tenantId: tenant.tenant.id,
      slug: tenant.tenant.slug,
      customDomain: tenant.tenant.customDomain,
      mode: tenant.tenant.mode,
      status: tenant.tenant.status,
      features: tenant.tenant.features,
      config: {
        ...tenant.config,
        currency: tenant.tenant.currency,
        timezone: tenant.tenant.timezone,
      },
      branding: {
        primary_color: tenant.tenant.branding.primary_color,
        secondary_color: tenant.tenant.branding.secondary_color,
        logo_url: tenant.tenant.branding.logo_url ?? '',
        favicon_url: tenant.tenant.branding.favicon_url ?? '',
        font: tenant.tenant.branding.font,
      },
      payment: {
        provider: tenant.payment?.provider ?? 'razorpay',
        credentials: tenant.payment?.credentials ?? {},
      },
      notification: tenant.tenant.notificationConfig,
    }
  }
}

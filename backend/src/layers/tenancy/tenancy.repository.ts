import { count, eq, sql } from 'drizzle-orm'

import { AppError } from '../../lib/errors.js'
import { decryptJson, decryptText, encryptJson, encryptText } from '../../lib/crypto.js'
import type { Database } from '../../lib/db.js'
import type {
  CreateTenantInput,
  PaginatedResult,
  Tenant,
  TenantConfig,
  TenantFullConfig,
  TenantPaymentConfig,
  TenantStats,
  TenantWithConfig,
  UpdatePaymentConfigInput,
  UpdateTenantConfigInput,
  UpdateTenantInput,
} from './tenancy.types.js'
import { DEFAULT_FULL_CONFIG } from './tenancy.types.js'
import { tenantConfig, tenantPaymentConfig, tenantStats, tenants } from './tenancy.schema.js'

export interface TenancyRepository {
  findBySlug(slug: string): Promise<Tenant | null>
  findByCustomDomain(domain: string): Promise<Tenant | null>
  findById(id: string): Promise<Tenant | null>
  findWithConfig(id: string): Promise<TenantWithConfig | null>
  findPaymentConfig(tenantId: string): Promise<TenantPaymentConfig | null>
  create(data: CreateTenantInput): Promise<Tenant>
  update(id: string, data: UpdateTenantInput): Promise<Tenant>
  updateConfig(tenantId: string, data: UpdateTenantConfigInput): Promise<TenantConfig>
  updatePaymentConfig(tenantId: string, data: UpdatePaymentConfigInput): Promise<TenantPaymentConfig>
  list(page: number, perPage: number): Promise<PaginatedResult<Tenant>>
  incrementStats(tenantId: string, stats: Partial<Omit<TenantStats, 'tenantId' | 'updatedAt'>>): Promise<void>
  decrementStats(tenantId: string, stats: Partial<Omit<TenantStats, 'tenantId' | 'updatedAt'>>): Promise<void>
}

const DEFAULT_CONFIG: TenantConfig = {
  shipping_flat_rate: 4900,
  free_shipping_threshold: null,
  shipping_strategy: 'flat_rate',
  marketplace_shipping_model: 'platform_managed',
  earn_rate: 1,
  redeem_rate: 100,
  cart_abandonment_delay_hours: 2,
  coupon_loyalty_stacking: false,
  return_window_days: 7,
}

const normalizeTenant = (row: typeof tenants.$inferSelect): Tenant => {
  const baseStorefront = row.fullConfig?.storefront
  const fullConfig: TenantFullConfig = {
    ...DEFAULT_FULL_CONFIG,
    ...(row.fullConfig ?? {}),
    businessType: row.businessType ?? 'ECOMMERCE',
    storefront: {
      ...DEFAULT_FULL_CONFIG.storefront,
      ...(baseStorefront ?? {}),
      localization: {
        ...DEFAULT_FULL_CONFIG.storefront.localization,
        ...(baseStorefront?.localization ?? {}),
      },
    },
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    customDomain: row.customDomain,
    mode: row.mode,
    status: row.status,
    businessType: row.businessType ?? 'ECOMMERCE',
    currency: row.currency,
    timezone: row.timezone,
    fullConfig,
    features: { inventory_management: false, ...row.features },
    branding: row.branding,
    notificationConfig: row.notificationConfig,
    taxConfig: (row.taxConfig as Record<string, unknown> | null) ?? null,
    payoutConfig: (row.payoutConfig as Record<string, unknown> | null) ?? null,
    billingPlanId: row.billingPlanId,
    trialEndsAt: row.trialEndsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const normalizeConfig = (row: typeof tenantConfig.$inferSelect | null): TenantConfig =>
  row
    ? {
        shipping_flat_rate: row.shippingFlatRate,
        free_shipping_threshold: row.freeShippingThreshold,
        shipping_strategy: row.shippingStrategy,
        earn_rate: Number(row.earnRate),
        redeem_rate: Number(row.redeemRate),
        cart_abandonment_delay_hours: row.cartAbandonmentDelayHours,
        coupon_loyalty_stacking: row.couponLoyaltyStacking,
        return_window_days: row.returnWindowDays,
      }
    : DEFAULT_CONFIG

const normalizePayment = (
  row: typeof tenantPaymentConfig.$inferSelect | null,
): TenantPaymentConfig | null =>
  row
    ? {
        provider: row.provider as TenantPaymentConfig['provider'],
        credentials:
          typeof row.credentials === 'string'
            ? decryptJson(row.credentials)
            : (row.credentials as Record<string, string>),
        webhook_secret: decryptText(row.webhookSecret),
        is_test_mode: row.isTestMode,
      }
    : null

const sanitizeDomain = (domain: string | null | undefined) => domain?.toLowerCase() ?? null

export class DrizzleTenancyRepository implements TenancyRepository {
  constructor(private readonly db: Database) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
    return row ? normalizeTenant(row) : null
  }

  async findByCustomDomain(domain: string): Promise<Tenant | null> {
    const normalizedDomain = sanitizeDomain(domain)
    if (!normalizedDomain) {
      return null
    }

    const [row] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.customDomain, normalizedDomain))
      .limit(1)

    return row ? normalizeTenant(row) : null
  }

  async findById(id: string): Promise<Tenant | null> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1)
    return row ? normalizeTenant(row) : null
  }

  async findWithConfig(id: string): Promise<TenantWithConfig | null> {
    const [row] = await this.db
      .select({
        tenant: tenants,
        config: tenantConfig,
        payment: tenantPaymentConfig,
      })
      .from(tenants)
      .leftJoin(tenantConfig, eq(tenantConfig.tenantId, tenants.id))
      .leftJoin(tenantPaymentConfig, eq(tenantPaymentConfig.tenantId, tenants.id))
      .where(eq(tenants.id, id))
      .limit(1)

    if (!row) {
      return null
    }

    const tenantNormalized = normalizeTenant(row.tenant)

    return {
      tenant: tenantNormalized,
      config: normalizeConfig(row.config),
      payment: normalizePayment(row.payment),
      fullConfig: tenantNormalized.fullConfig,
    }
  }

  async findPaymentConfig(tenantId: string): Promise<TenantPaymentConfig | null> {
    const [row] = await this.db
      .select()
      .from(tenantPaymentConfig)
      .where(eq(tenantPaymentConfig.tenantId, tenantId))
      .limit(1)

    return normalizePayment(row ?? null)
  }

  async create(data: CreateTenantInput): Promise<Tenant> {
    try {
      const created = await this.db.transaction(async (tx) => {
        const fullConfig = {
          ...DEFAULT_FULL_CONFIG,
          businessType: data.businessType ?? 'ECOMMERCE',
          ...(data.fullConfig ?? {}),
        }

        const [tenantRow] = await tx
          .insert(tenants)
          .values({
            name: data.name,
            slug: data.slug,
            customDomain: sanitizeDomain(data.customDomain),
            mode: data.mode ?? 'SINGLE_VENDOR',
            businessType: data.businessType ?? 'ECOMMERCE',
            currency: data.currency ?? 'INR',
            timezone: data.timezone ?? 'Asia/Kolkata',
            fullConfig,
            features: {
              wishlist: false,
              loyalty: false,
              reviews: false,
              cart_abandonment: false,
              ...data.features,
            },
            branding: {
              primary_color: '#000000',
              secondary_color: '#ffffff',
              logo_url: null,
              favicon_url: null,
              font: 'Inter',
              ...data.branding,
            },
            notificationConfig: {
              from_name: 'Store',
              from_email: 'noreply@nexuscommerce.app',
              ...data.notificationConfig,
            },
          })
          .returning()

        await tx.insert(tenantConfig).values({ tenantId: tenantRow.id })
        await tx.insert(tenantStats).values({ tenantId: tenantRow.id })
        return tenantRow
      })

      return normalizeTenant(created)
    } catch (error) {
      this.handleConstraintError(error)
      throw error
    }
  }

  async update(id: string, data: UpdateTenantInput): Promise<Tenant> {
    try {
      const [row] = await this.db
        .update(tenants)
        .set({
          name: data.name,
          customDomain: data.customDomain === undefined ? undefined : sanitizeDomain(data.customDomain),
          mode: data.mode,
          status: data.status,
          businessType: data.businessType,
          currency: data.currency,
          timezone: data.timezone,
          fullConfig: data.fullConfig as typeof tenants.$inferInsert.fullConfig,
          features: data.features as typeof tenants.$inferInsert.features,
          branding: data.branding as typeof tenants.$inferInsert.branding,
          notificationConfig:
            data.notificationConfig as typeof tenants.$inferInsert.notificationConfig,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, id))
        .returning()

      if (!row) {
        throw new AppError('Tenant not found', 404, 'tenant-not-found')
      }

      return normalizeTenant(row)
    } catch (error) {
      this.handleConstraintError(error)
      throw error
    }
  }

  async updateConfig(tenantId: string, data: UpdateTenantConfigInput): Promise<TenantConfig> {
    const [row] = await this.db
      .insert(tenantConfig)
      .values({
        tenantId,
        shippingFlatRate: data.shipping_flat_rate ?? DEFAULT_CONFIG.shipping_flat_rate,
        freeShippingThreshold:
          data.free_shipping_threshold ?? DEFAULT_CONFIG.free_shipping_threshold,
        shippingStrategy: data.shipping_strategy ?? DEFAULT_CONFIG.shipping_strategy,
        earnRate: String(data.earn_rate ?? DEFAULT_CONFIG.earn_rate),
        redeemRate: String(data.redeem_rate ?? DEFAULT_CONFIG.redeem_rate),
        cartAbandonmentDelayHours:
          data.cart_abandonment_delay_hours ?? DEFAULT_CONFIG.cart_abandonment_delay_hours,
        couponLoyaltyStacking:
          data.coupon_loyalty_stacking ?? DEFAULT_CONFIG.coupon_loyalty_stacking,
        returnWindowDays: data.return_window_days ?? DEFAULT_CONFIG.return_window_days,
      })
      .onConflictDoUpdate({
        target: tenantConfig.tenantId,
        set: {
          shippingFlatRate: data.shipping_flat_rate,
          freeShippingThreshold: data.free_shipping_threshold,
          shippingStrategy: data.shipping_strategy,
          earnRate: data.earn_rate === undefined ? undefined : String(data.earn_rate),
          redeemRate: data.redeem_rate === undefined ? undefined : String(data.redeem_rate),
          cartAbandonmentDelayHours: data.cart_abandonment_delay_hours,
          couponLoyaltyStacking: data.coupon_loyalty_stacking,
          returnWindowDays: data.return_window_days,
          updatedAt: new Date(),
        },
      })
      .returning()

    return normalizeConfig(row ?? null)
  }

  async updatePaymentConfig(
    tenantId: string,
    data: UpdatePaymentConfigInput,
  ): Promise<TenantPaymentConfig> {
    const [row] = await this.db
      .insert(tenantPaymentConfig)
      .values({
        tenantId,
        provider: data.provider ?? 'razorpay',
        credentials: encryptJson(data.credentials),
        webhookSecret: encryptText(data.webhook_secret),
        isTestMode: data.is_test_mode ?? false,
      })
      .onConflictDoUpdate({
        target: tenantPaymentConfig.tenantId,
        set: {
          provider: data.provider,
          credentials: encryptJson(data.credentials),
          webhookSecret: encryptText(data.webhook_secret),
          isTestMode: data.is_test_mode,
          updatedAt: new Date(),
        },
      })
      .returning()

    if (!row) {
      throw new AppError('Failed to persist tenant payment config', 500, 'tenant-payment-save-failed')
    }

    return normalizePayment(row)!
  }

  async list(page: number, perPage: number): Promise<PaginatedResult<Tenant>> {
    const safePage = Math.max(1, page)
    const safePerPage = Math.max(1, Math.min(perPage, 100))
    const offset = (safePage - 1) * safePerPage

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(tenants)
        .orderBy(tenants.createdAt)
        .limit(safePerPage)
        .offset(offset),
      this.db.select({ total: count() }).from(tenants),
    ])

    return {
      items: rows.map(normalizeTenant),
      page: safePage,
      perPage: safePerPage,
      total: totalRows[0]?.total ?? 0,
    }
  }

  async incrementStats(tenantId: string, stats: Partial<Omit<TenantStats, 'tenantId' | 'updatedAt'>>): Promise<void> {
    await this.db
      .insert(tenantStats)
      .values({
        tenantId,
        totalRevenue: stats.totalRevenue ?? 0,
        totalOrders: stats.totalOrders ?? 0,
        totalCommission: stats.totalCommission ?? 0,
        totalVendors: stats.totalVendors ?? 0,
        totalCustomers: stats.totalCustomers ?? 0,
      })
      .onConflictDoUpdate({
        target: tenantStats.tenantId,
        set: {
          totalRevenue: sql`${tenantStats.totalRevenue} + ${stats.totalRevenue ?? 0}`,
          totalOrders: sql`${tenantStats.totalOrders} + ${stats.totalOrders ?? 0}`,
          totalCommission: sql`${tenantStats.totalCommission} + ${stats.totalCommission ?? 0}`,
          totalVendors: sql`${tenantStats.totalVendors} + ${stats.totalVendors ?? 0}`,
          totalCustomers: sql`${tenantStats.totalCustomers} + ${stats.totalCustomers ?? 0}`,
          updatedAt: new Date(),
        },
      })
  }

  async decrementStats(tenantId: string, stats: Partial<Omit<TenantStats, 'tenantId' | 'updatedAt'>>): Promise<void> {
    await this.db
      .update(tenantStats)
      .set({
        totalRevenue: sql`${tenantStats.totalRevenue} - ${stats.totalRevenue ?? 0}`,
        totalOrders: sql`${tenantStats.totalOrders} - ${stats.totalOrders ?? 0}`,
        totalCommission: sql`${tenantStats.totalCommission} - ${stats.totalCommission ?? 0}`,
        totalVendors: sql`${tenantStats.totalVendors} - ${stats.totalVendors ?? 0}`,
        totalCustomers: sql`${tenantStats.totalCustomers} - ${stats.totalCustomers ?? 0}`,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
  }

  private handleConstraintError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      const message = 'constraint' in error ? String((error as { constraint?: string }).constraint) : ''
      if (message.includes('slug')) {
        throw new AppError('Tenant slug already exists', 409, 'tenant-slug-conflict')
      }
      if (message.includes('custom_domain')) {
        throw new AppError('Tenant custom domain already exists', 409, 'tenant-domain-conflict')
      }
      throw new AppError('Unique constraint violation', 409, 'unique-conflict')
    }
  }
}

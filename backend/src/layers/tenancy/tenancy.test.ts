import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

import {
  cartKey,
  categoryCacheKey,
  catalogListKey,
  idempotencyKey,
  productCacheKey,
  rateLimitKey,
} from '../../lib/redis-keys.js'
import { exportPath, productImagePath, vendorImagePath } from '../../lib/storage-paths.js'
import {
  cartAbandonmentQueue,
  exportQueue,
  inventoryReleaseQueue,
  notificationQueue,
  searchSyncQueue,
} from '../../lib/queue-names.js'
import { AppError } from '../../lib/errors.js'
import { decryptJson, decryptText, encryptJson, encryptText } from '../../lib/crypto.js'
import { createTenancyRoutes } from './tenancy.routes.js'
import { TenancyService } from './tenancy.service.js'
import type { TenancyRepository } from './tenancy.repository.js'
import type { Tenant, TenantConfig, TenantPaymentConfig, TenantWithConfig } from './tenancy.types.js'
import { DEFAULT_FULL_CONFIG } from './tenancy.types.js'
import { ConfigService } from './tenancy.config-service.js'
import { createTenantMiddleware } from '../../middleware/tenant.middleware.js'
import type { CustomerRepository } from '../../modules/customers/customers.repository.js'

const tenantFixture: Tenant = {
  id: 'tenant-1',
  name: 'Store A',
  slug: 'store-a',
  customDomain: 'store-a.com',
  mode: 'SINGLE_VENDOR',
  status: 'active',
  businessType: 'ECOMMERCE',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  fullConfig: DEFAULT_FULL_CONFIG,
  features: {
    wishlist: false,
    loyalty: true,
    reviews: false,
    cart_abandonment: true,
    inventory_management: false,
  },
  branding: {
    primary_color: '#111111',
    secondary_color: '#ffffff',
    logo_url: null,
    favicon_url: null,
    font: 'Inter',
  },
  notificationConfig: {
    from_name: 'Store A',
    from_email: 'hello@store-a.com',
  },
  taxConfig: null,
  payoutConfig: null,
  billingPlanId: null,
  trialEndsAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

const configFixture: TenantConfig = {
  shipping_flat_rate: 4900,
  free_shipping_threshold: 10000,
  shipping_strategy: 'flat_rate',
  earn_rate: 1,
  redeem_rate: 100,
  cart_abandonment_delay_hours: 2,
  coupon_loyalty_stacking: false,
  return_window_days: 7,
}

const paymentFixture: TenantPaymentConfig = {
  provider: 'razorpay',
  credentials: { keyId: 'rzp_test_123' },
  webhook_secret: 'secret',
  is_test_mode: true,
}

const buildRepository = (overrides: Partial<TenancyRepository> = {}): TenancyRepository => ({
  findBySlug: vi.fn().mockResolvedValue(null),
  findByCustomDomain: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(tenantFixture),
  findWithConfig: vi.fn().mockResolvedValue({
    tenant: tenantFixture,
    config: configFixture,
    payment: paymentFixture,
    fullConfig: DEFAULT_FULL_CONFIG,
  } satisfies TenantWithConfig),
  findPaymentConfig: vi.fn().mockResolvedValue(paymentFixture),
  create: vi.fn().mockImplementation(async (data) => ({
    ...tenantFixture,
    ...data,
  })),
  update: vi.fn().mockImplementation(async (_id, data) => ({
    ...tenantFixture,
    ...data,
  })),
  updateConfig: vi.fn().mockResolvedValue(configFixture),
  updatePaymentConfig: vi.fn().mockResolvedValue(paymentFixture),
  list: vi.fn().mockResolvedValue({
    items: [tenantFixture],
    page: 1,
    perPage: 20,
    total: 1,
  }),
  incrementStats: vi.fn().mockResolvedValue(undefined),
  decrementStats: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

const buildCustomerRepository = (overrides: Partial<CustomerRepository> = {}): CustomerRepository =>
  ({
    updateAdminStatus: vi.fn().mockResolvedValue({
      id: 'customer-1',
      tenantId: 'tenant-1',
      partnerId: null,
      supabaseAuthId: null,
      email: 'admin@tenant.com',
      passwordHash: null,
      firstName: null,
      lastName: null,
      phone: null,
      avatarUrl: null,
      isAdmin: true,
      emailVerifiedAt: null,
      lastLoginAt: null,
      gdprDeletionRequestedAt: null,
      tierId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ...overrides,
  }) as unknown as CustomerRepository

describe('ConfigService', () => {
  it('correctly reports capabilities for default ECOMMERCE business type', () => {
    const configService = new ConfigService(DEFAULT_FULL_CONFIG)

    expect(configService.getBusinessType()).toBe('ECOMMERCE')
    expect(configService.isEcommerce()).toBe(true)
    expect(configService.isMarketplace()).toBe(false)
    expect(configService.isRestaurant()).toBe(false)
    expect(configService.getCurrency()).toBe('INR')
    expect(configService.getCurrencySymbol()).toBe('₹')
    expect(configService.hasVariants()).toBe(true)
    expect(configService.getDefaultDashboardPage()).toBe('orders')
  })

  it('correctly evaluates RESTAURANT business type capabilities', () => {
    const restaurantConfig = {
      ...DEFAULT_FULL_CONFIG,
      businessType: 'RESTAURANT' as const,
      partner: {
        seller: false,
        fulfillment: true,
        warehouse: false,
        courier: false,
      },
      modules: {
        catalog: {
          enabled: true,
          variants: false,
          attributes: true,
          collections: true,
          brands: false,
        },
        restaurant: { enabled: true },
      },
    }

    const configService = new ConfigService(restaurantConfig)

    expect(configService.getBusinessType()).toBe('RESTAURANT')
    expect(configService.isRestaurant()).toBe(true)
    expect(configService.hasVariants()).toBe(false)
    expect(configService.isPartnerFulfillmentEnabled()).toBe(true)
    expect(configService.isModuleEnabled('restaurant')).toBe(true)
  })

  it('correctly evaluates MARKETPLACE business type capabilities', () => {
    const marketplaceConfig = {
      ...DEFAULT_FULL_CONFIG,
      businessType: 'MARKETPLACE' as const,
      modules: {
        marketplace: {
          enabled: true,
          sellerApproval: 'MANUAL' as const,
          commissionRate: 12.5,
        },
      },
    }

    const configService = new ConfigService(marketplaceConfig)

    expect(configService.isMarketplace()).toBe(true)
    expect(configService.getModuleSettings('marketplace')).toEqual({
      enabled: true,
      sellerApproval: 'MANUAL',
      commissionRate: 12.5,
    })
  })
})

describe('TenancyService', () => {
  it('resolves by custom domain and hydrates tenant context', async () => {
    const repository = buildRepository({
      findByCustomDomain: vi.fn().mockResolvedValue(tenantFixture),
    })
    const service = new TenancyService(repository)

    const tenant = await service.resolveByHostname('store-a.com')

    expect(tenant?.tenantId).toBe('tenant-1')
    expect(tenant?.payment.credentials).toEqual({ keyId: 'rzp_test_123' })
  })

  it('resolves by subdomain when custom domain is missing', async () => {
    const repository = buildRepository({
      findBySlug: vi.fn().mockResolvedValue(tenantFixture),
    })
    const service = new TenancyService(repository)

    const tenant = await service.resolveByHostname('store-a.nexuscommerce.app')

    expect(tenant?.slug).toBe('store-a')
    expect(repository.findBySlug).toHaveBeenCalledWith('store-a')
  })

  it('preserves tenant mode in the resolved tenant context', async () => {
    const repository = buildRepository({
      findByCustomDomain: vi.fn().mockResolvedValue({ ...tenantFixture, mode: 'MULTI_VENDOR' }),
      findWithConfig: vi.fn().mockResolvedValue({
        tenant: { ...tenantFixture, mode: 'MULTI_VENDOR' },
        config: configFixture,
        payment: paymentFixture,
        fullConfig: DEFAULT_FULL_CONFIG,
      } satisfies TenantWithConfig),
    })
    const service = new TenancyService(repository)

    const tenant = await service.resolveByHostname('store-a.com')

    expect(tenant?.mode).toBe('MULTI_VENDOR')
  })

  it('rejects slug changes during updates', async () => {
    const service = new TenancyService(buildRepository())

    await expect(service.updateTenant('tenant-1', { slug: 'new-slug' })).rejects.toMatchObject({
      code: 'tenant-slug-immutable',
      statusCode: 400,
    })
  })

  it('prevents activation when payment config is missing', async () => {
    const repository = buildRepository({
      findWithConfig: vi.fn().mockResolvedValue({
        tenant: { ...tenantFixture, status: 'onboarding' },
        config: configFixture,
        payment: null,
        fullConfig: DEFAULT_FULL_CONFIG,
      } satisfies TenantWithConfig),
    })
    const service = new TenancyService(repository)

    await expect(service.updateStatus('tenant-1', 'active')).rejects.toMatchObject({
      code: 'tenant-payment-missing',
      statusCode: 409,
    })
  })

  it('redacts payment credentials from tenant details', async () => {
    const service = new TenancyService(buildRepository())

    const result = await service.getTenant('tenant-1')

    expect(result.payment?.credentials).toEqual({})
    expect(result.payment?.provider).toBe('razorpay')
  })

  it('returns null for unknown hostnames', async () => {
    const service = new TenancyService(buildRepository())
    await expect(service.resolveByHostname('unknown.example.com')).resolves.toBeNull()
  })

  it('grants tenant admin status to a tenant-scoped customer', async () => {
    const customers = buildCustomerRepository()
    const service = new TenancyService(buildRepository(), customers)

    const customer = await service.grantTenantAdmin('tenant-1', 'customer-1')

    expect(customer.isAdmin).toBe(true)
    expect(customers.updateAdminStatus).toHaveBeenCalledWith('tenant-1', 'customer-1', true)
  })

  it('revokes tenant admin status from a tenant-scoped customer', async () => {
    const customers = buildCustomerRepository({
      updateAdminStatus: vi.fn().mockResolvedValue({
        id: 'customer-1',
        tenantId: 'tenant-1',
        partnerId: null,
        supabaseAuthId: null,
        email: 'admin@tenant.com',
        passwordHash: null,
        firstName: null,
        lastName: null,
        phone: null,
        avatarUrl: null,
        isAdmin: false,
        emailVerifiedAt: null,
        lastLoginAt: null,
        gdprDeletionRequestedAt: null,
        tierId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })
    const service = new TenancyService(buildRepository(), customers)

    const customer = await service.revokeTenantAdmin('tenant-1', 'customer-1')

    expect(customer.isAdmin).toBe(false)
    expect(customers.updateAdminStatus).toHaveBeenCalledWith('tenant-1', 'customer-1', false)
  })
})

describe('tenant middleware', () => {
  it('blocks suspended tenants with 503', async () => {
    const repository = buildRepository({
      findByCustomDomain: vi.fn().mockResolvedValue(tenantFixture),
      findWithConfig: vi.fn().mockResolvedValue({
        tenant: { ...tenantFixture, status: 'suspended' },
        config: configFixture,
        payment: paymentFixture,
        fullConfig: DEFAULT_FULL_CONFIG,
      } satisfies TenantWithConfig),
    })
    const service = new TenancyService(repository)
    const app = new Hono()

    app.onError((error, c) => {
      if (error instanceof AppError) {
        c.status(error.statusCode as 403 | 404 | 409 | 500 | 503)
        return c.json({ code: error.code })
      }

      throw error
    })
    app.use('*', createTenantMiddleware(service))
    app.get('/', (c) => c.json({ ok: true }))

    const response = await app.request('https://store-a.com/')

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'tenant-suspended' })
  })

  it('stores tenant context for active tenants', async () => {
    const repository = buildRepository({
      findByCustomDomain: vi.fn().mockResolvedValue(tenantFixture),
    })
    const service = new TenancyService(repository)
    const app = new Hono<{ Variables: { tenant: { tenantId: string } } }>()

    app.use('*', createTenantMiddleware(service))
    app.get('/', (c) => c.json({ tenantId: c.get('tenant').tenantId }))

    const response = await app.request('https://store-a.com/')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ tenantId: 'tenant-1' })
  })
})

describe('tenancy routes', () => {
  it('requires super admin for admin routes', async () => {
    const service = new TenancyService(buildRepository())
    const app = new Hono<{ Variables: { isSuperAdmin?: boolean } }>()
    app.onError((error, c) => {
      if (error instanceof AppError) {
        c.status(error.statusCode as 403 | 404 | 409 | 500 | 503)
        return c.json({ code: error.code })
      }
      throw error
    })
    app.route('/', createTenancyRoutes(service))

    const response = await app.request('https://example.com/admin/tenants')

    expect(response.status).toBe(403)
  })

  it('creates tenants through the admin route', async () => {
    const service = new TenancyService(buildRepository())
    const app = new Hono<{ Variables: { isSuperAdmin?: boolean } }>()
    app.use('/admin/*', async (c, next) => {
      c.set('isSuperAdmin', true)
      await next()
    })
    app.route('/', createTenancyRoutes(service))

    const response = await app.request('https://example.com/admin/tenants', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Store B',
        slug: 'store-b',
      }),
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as { data: { slug: string } }
    expect(body.data.slug).toBe('store-b')
  })
})

describe('tenant-prefixed helpers', () => {
  it('builds redis keys with tenant prefixes', () => {
    expect(cartKey('tenant-1', 'cart-1')).toBe('tenant:tenant-1:cart:cart-1')
    expect(rateLimitKey('tenant-1', '127.0.0.1', 'checkout')).toBe(
      'tenant:tenant-1:rate-limit:127.0.0.1:checkout',
    )
    expect(idempotencyKey('tenant-1', 'abc')).toBe('tenant:tenant-1:idempotency:abc')
    expect(productCacheKey('tenant-1', 'shirt')).toBe('tenant:tenant-1:product:shirt')
    expect(categoryCacheKey('tenant-1', 'summer')).toBe('tenant:tenant-1:category:summer')
    expect(catalogListKey('tenant-1', 'hash')).toBe('tenant:tenant-1:catalog:list:hash')
  })

  it('builds tenant-prefixed storage paths', () => {
    expect(productImagePath('tenant-1', 'product-1', 'image.png')).toBe(
      '/tenant-1/products/product-1/image.png',
    )
    expect(vendorImagePath('tenant-1', 'vendor-1', 'avatar.png')).toBe(
      '/tenant-1/vendors/vendor-1/avatar.png',
    )
    expect(exportPath('tenant-1', 'export-1')).toBe('/tenant-1/exports/export-1')
  })

  it('builds tenant-prefixed queue names', () => {
    expect(cartAbandonmentQueue('tenant-1')).toBe('tenant:tenant-1:cart-abandonment')
    expect(searchSyncQueue('tenant-1')).toBe('tenant:tenant-1:search-sync')
    expect(notificationQueue('tenant-1')).toBe('tenant:tenant-1:notifications')
    expect(inventoryReleaseQueue('tenant-1')).toBe('tenant:tenant-1:inventory-release')
    expect(exportQueue('tenant-1')).toBe('tenant:tenant-1:exports')
  })
})

describe('crypto helpers', () => {
  it('encrypts and decrypts payment credentials', () => {
    const encrypted = encryptJson({ keyId: 'rzp_test_123' }, 'test-secret')

    expect(encrypted).not.toContain('rzp_test_123')
    expect(decryptJson(encrypted, 'test-secret')).toEqual({ keyId: 'rzp_test_123' })
  })

  it('encrypts and decrypts webhook secrets', () => {
    const encrypted = encryptText('whsec_123', 'test-secret')

    expect(encrypted).not.toContain('whsec_123')
    expect(decryptText(encrypted, 'test-secret')).toBe('whsec_123')
  })
})

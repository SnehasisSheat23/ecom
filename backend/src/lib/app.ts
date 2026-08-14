import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { ZodError } from 'zod'

import { createTenantMiddleware } from '../middleware/tenant.middleware.js'
import { createTenancyRoutes } from '../layers/tenancy/tenancy.routes.js'
import { DrizzleTenancyRepository } from '../layers/tenancy/tenancy.repository.js'
import { createPartnerRoutes } from '../modules/partner/partner.routes.js'
import { PartnerRepository } from '../modules/partner/partner.repository.js'
import { PartnerService } from '../modules/partner/partner.service.js'
import { createPincodeRoutes } from '../modules/pincode/pincode.routes.js'
import { PincodeRepository } from '../modules/pincode/pincode.repository.js'
import { PincodeService } from '../modules/pincode/pincode.service.js'

import { createCustomersRoutes } from '../modules/customers/customers.routes.js'
import { createCatalogRoutes } from '../modules/catalog/catalog.routes.js'
import { CatalogRepository } from '../modules/catalog/catalog.repository.js'
import { createProductTypeRoutes } from '../modules/catalog/product-types/product-type.routes.js'
import { ProductTypeRepository } from '../modules/catalog/product-types/product-type.repository.js'
import { ProductTypeService } from '../modules/catalog/product-types/product-type.service.js'
import { createCartExpiryScheduler } from '../modules/cart/cart.jobs.js'
import { CartRepository } from '../modules/cart/cart.repository.js'
import { createCartRoutes } from '../modules/cart/cart.routes.js'
import { CartService } from '../modules/cart/cart.service.js'
import {
  AddressRepository,
  CustomerRepository,
  GuestSessionRepository,
  PasswordResetRepository,
  RefreshTokenRepository,
} from '../modules/customers/customers.repository.js'
import { createInventoryReleaseScheduler } from '../modules/inventory/inventory.jobs.js'
import { InventoryRepository } from '../modules/inventory/inventory.repository.js'
import { createInventoryRoutes } from '../modules/inventory/inventory.routes.js'
import { InventoryService } from '../modules/inventory/inventory.service.js'
import { createOrdersRoutes } from '../modules/orders/orders.routes.js'
import { OrdersRepository } from '../modules/orders/orders.repository.js'
import { OrdersService } from '../modules/orders/orders.service.js'
import { createPaymentsRoutes } from '../modules/payments/payments.routes.js'
import { PaymentsRepository } from '../modules/payments/payments.repository.js'
import { PaymentsService } from '../modules/payments/payments.service.js'
import { createShippingRoutes } from '../modules/shipping/shipping.routes.js'
import { createSupportRoutes } from '../modules/support/support.routes.js'
import { SupportRepository } from '../modules/support/support.repository.js'
import { SupportService } from '../modules/support/support.service.js'
import { BlogsService } from '../modules/blogs/blogs.service.js'
import { BlogsRepository } from '../modules/blogs/blogs.repository.js'
import { createBlogsRoutes } from '../modules/blogs/blogs.routes.js'
import { TenancyService } from '../layers/tenancy/tenancy.service.js'
import { NotificationsService } from '../modules/notifications/notifications.service.js'
import { createNotificationJobs } from '../modules/notifications/notifications.jobs.js'
import { AnalyticsService } from '../modules/analytics/analytics.service.js'
import { AnalyticsRepository } from '../modules/analytics/analytics.repository.js'
import { createAnalyticsRoutes } from '../modules/analytics/analytics.routes.js'
import { DeliveryService } from '../modules/delivery/delivery.service.js'
import { createDeliveryRoutes } from '../modules/delivery/delivery.routes.js'
import { CustomersService } from '../modules/customers/customers.service.js'
import { CatalogService } from '../modules/catalog/catalog.service.js'
import { MediaRepository } from '../modules/media/media.repository.js'
import { MediaService } from '../modules/media/media.service.js'
import { createMediaRoutes } from '../modules/media/media.routes.js'

import { ActivityLogRepository } from '../modules/activity-log/activity-log.repository.js'
import { ActivityLogService } from '../modules/activity-log/activity-log.service.js'
import { createActivityLogRoutes } from '../modules/activity-log/activity-log.routes.js'
import { ShippingService } from '../modules/shipping/shipping.service.js'
import { ShippingRepository } from '../modules/shipping/shipping.repository.js'
import { createAuthRoutes } from '../modules/auth/auth.routes.js'
import { createAuthMiddleware, createPlatformAuthMiddleware } from '../middleware/auth.middleware.js'
import { UsersService } from '../modules/users/users.service.js'
import { qstashAuthMiddleware } from '../middleware/qstash-auth.middleware.js'
import { CategoriesRepository } from '../modules/categories/categories.repository.js'
import { CategoriesService } from '../modules/categories/categories.service.js'
import { createCategoriesRoutes } from '../modules/categories/categories.routes.js'
import { CollectionsRepository } from '../modules/collections/collections.repository.js'
import { CollectionsService } from '../modules/collections/collections.service.js'
import { createCollectionsRoutes } from '../modules/collections/collections.routes.js'
import type { Database } from './db.js'
import type { AppBindings } from './http.js'
import { AppError } from './errors.js'
import { IdempotencyStore } from './idempotency.js'
import { requireEnv } from './env.js'
import { getJobQueueProvider } from '../providers/queue/queue.factory.js'
import { getCacheProvider } from '../providers/cache/cache.factory.js'
import { getStorageProvider } from '../providers/storage/storage.factory.js'
import { getEventPublisher } from '../providers/events/event.factory.js'

export interface CreateAppOptions {
  tenancyService: TenancyService
  db?: Database
  customersService?: CustomersService
  catalogService?: CatalogService
  inventoryService?: InventoryService
  shippingService?: ShippingService
  cartService?: CartService
  ordersService?: OrdersService
  paymentsService?: PaymentsService
  supportService?: SupportService
  blogsService?: BlogsService
  analyticsService?: AnalyticsService
  notificationsService?: NotificationsService
  deliveryService?: DeliveryService
  mediaService?: MediaService
  activityLogService?: ActivityLogService
}

const createDefaultInventoryService = (db: Database): InventoryService => {
  const releaseScheduler = createInventoryReleaseScheduler(getJobQueueProvider(), {
    url: `${requireEnv('API_BASE_URL').replace(/\/$/, '')}/internal/jobs/inventory/release`,
  })

  return new InventoryService(new InventoryRepository(db), releaseScheduler)
}

const createDefaultCustomersService = (db: Database): CustomersService => {
  return new CustomersService(
    new CustomerRepository(db),
    new AddressRepository(db),
    new GuestSessionRepository(db),
    new RefreshTokenRepository(db),
    new PasswordResetRepository(db),
  )
}

export const createApp = ({
  tenancyService,
  db,
  customersService,
  catalogService,
  inventoryService,
  shippingService,
  cartService,
  ordersService,
  paymentsService,
  supportService,
  blogsService,
  analyticsService,
  notificationsService,
  deliveryService,
  mediaService,
  activityLogService,
}: CreateAppOptions) => {
  const app = new Hono<AppBindings>()
  const customerRepository = db ? new CustomerRepository(db) : undefined
  const adminTenancyService =
    db && customerRepository
      ? new TenancyService(new DrizzleTenancyRepository(db), customerRepository, getCacheProvider())
      : tenancyService
  const resolvedActivityLogService =
    activityLogService ?? (db ? new ActivityLogService(new ActivityLogRepository(db)) : undefined)
  const resolvedDeliveryService =
    deliveryService ?? (db ? new DeliveryService(db) : undefined)
  const resolvedPartnerService = db ? new PartnerService(new PartnerRepository(db)) : undefined
  const resolvedPincodeService = db ? new PincodeService(new PincodeRepository(db), getCacheProvider()) : undefined
  const resolvedFulfillmentService = undefined
  const resolvedMarketplaceService = undefined
  const resolvedInventoryService = inventoryService ?? (db ? createDefaultInventoryService(db) : undefined)
  const resolvedMediaService =
    mediaService ??
    (db
      ? new MediaService(
          new MediaRepository(db),
          getStorageProvider(),
        )
      : undefined)
  const resolvedCatalogService =
    catalogService ??
    (db
      ? new CatalogService(
          new CatalogRepository(db),
          resolvedInventoryService,
          resolvedPartnerService ? (resolvedPartnerService as any).repository : undefined,
          getStorageProvider(),
          getCacheProvider(),
        )
      : undefined)
  const resolvedShippingService =
    shippingService ??
    (db ? new ShippingService(new ShippingRepository(db), resolvedDeliveryService, db) : undefined)

  const resolvedCartService =
    cartService ??
    (db && resolvedInventoryService && resolvedShippingService
      ? new CartService(
          new CartRepository(db),
          resolvedInventoryService,
          resolvedShippingService,
          undefined,
          createCartExpiryScheduler(getJobQueueProvider(), {
            url: `${requireEnv('API_BASE_URL').replace(/\/$/, '')}/internal/jobs/cart/expiry`,
          }),
          undefined,
          async (tenantId) => tenancyService.getTenantContext(tenantId),
        )
      : undefined)
  const orderHooks = resolvedMarketplaceService
    ? {
        checkServiceability: async (tenantId: string, partnerIds: string[], pincode: string) => {
          if ((resolvedMarketplaceService as any).checkServiceability) {
            return (resolvedMarketplaceService as any).checkServiceability(tenantId, partnerIds, pincode)
          }
          return true
        },
        onOrderCreated: async (orderId: string, tenantId: string) => {
          if ((resolvedMarketplaceService as any).handleOrderCreated) {
            await (resolvedMarketplaceService as any).handleOrderCreated(orderId, tenantId)
          }
        },
      }
    : undefined

  const resolvedOrdersService =
    ordersService ??
    (db && resolvedCartService && resolvedShippingService
      ? new OrdersService(
          new OrdersRepository(db),
          new CartRepository(db),
          new AddressRepository(db),
          resolvedShippingService,
          getEventPublisher(),
          orderHooks,
          new IdempotencyStore(getCacheProvider()),
          resolvedDeliveryService,
          resolvedInventoryService,
        )
      : undefined)
  const resolvedPaymentsService =
    paymentsService ??
    (db
      ? new PaymentsService(
          new PaymentsRepository(db),
          tenancyService,
          undefined,
          undefined,
          undefined,
          resolvedMarketplaceService,
        )
      : undefined)
  const resolvedSupportService =
    supportService ?? (db ? new SupportService(new SupportRepository(db)) : undefined)
  const resolvedBlogsService =
    blogsService ?? (db ? new BlogsService(new BlogsRepository(db), getStorageProvider()) : undefined)
  const resolvedAnalyticsService = 
    analyticsService ?? (db ? new AnalyticsService(new AnalyticsRepository(db)) : undefined)
  
  const resolvedNotificationsService = notificationsService

  app.use('*', honoLogger())

  app.use(
    '*',
    cors({
      origin: async (origin, c) => {
        if (!origin) return null

        // 1. Allow localhost, workers.dev, pages.dev, and vercel.app origins
        const isAllowedOrigin = 
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /\.workers\.dev$/.test(origin) ||
          /\.pages\.dev$/.test(origin) ||
          /\.vercel\.app$/.test(origin)
        if (isAllowedOrigin) {
          return origin
        }

        // 2. Dynamically check tenant domain records
        try {
          const hostname = new URL(origin).hostname
          const tenant = await tenancyService.resolveByHostname(hostname)
          if (tenant) {
            return origin
          }
        } catch (err) {
          console.error('CORS origin validation failed:', err)
        }

        // Reject other origins
        return null
      },
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Tenant-Id',
        'x-tenant-id',
        'X-Guest-Session-Id',
        'x-guest-session-id',
        'X-Requested-With',
        'Accept',
      ],
      exposeHeaders: ['Content-Length', 'Content-Range'],
      maxAge: 86400,
      credentials: true,
    })
  )

  app.onError((error, c) => {
    // Ensure CORS headers are sent even on error
    c.header('Access-Control-Allow-Origin', c.req.header('origin') || '*')
    c.header('Access-Control-Allow-Credentials', 'true')

    // Force error log to console for Cloudflare Observability & Terminal
    console.error(`❌ [API Error] ${c.req.method} ${c.req.url}:`, error)

    if (error instanceof ZodError) {
      console.error('❌ [Validation Issues]:', JSON.stringify(error.issues, null, 2))
      return c.json(
        {
          error: 'Validation failed',
          code: 'validation-error',
          details: error.issues,
        },
        400,
      )
    }

    if (error instanceof AppError) {
      console.error(`❌ [AppError ${error.statusCode}]: ${error.code} - ${error.message}`)
      c.status(error.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503)
      return c.json({ error: error.message, code: error.code })
    }

    if (error instanceof Error && error.stack) {
      console.error('❌ [Error Stack]:', error.stack)
    }

    c.status(500)
    return c.json({ error: 'Internal server error', code: 'internal-error' })
  })

  app.get('/health', (c) => c.json({ ok: true }))
  app.use('/internal/jobs/*', qstashAuthMiddleware())
  if (db) {
    app.use('*', async (c, next) => {
      const pathname = new URL(c.req.url).pathname
      // Skip tenant resolution for health checks and internal job routes
      // (QStash callbacks don't have tenant context — they're authenticated via signature)
      if (pathname === '/health' || pathname.startsWith('/internal/')) {
        await next()
        return
      }
      const resolvedTenancyService = adminTenancyService ?? tenancyService
      if (!resolvedTenancyService) {
        throw new AppError('Tenancy service not available', 500, 'tenancy-unavailable')
      }
      return createTenantMiddleware(resolvedTenancyService)(c, next)
    })
  }
  const resolvedCustomersService = customersService ?? (db ? createDefaultCustomersService(db) : undefined)
  const resolvedUsersService = db ? new UsersService(db) : undefined

  if (resolvedUsersService) {
    app.use('/admin/*', createPlatformAuthMiddleware(resolvedUsersService, resolvedCustomersService))
    app.use('/vendor/*', createPlatformAuthMiddleware(resolvedUsersService, resolvedCustomersService))
  }
  app.route('/', createTenancyRoutes(adminTenancyService))
  app.route('/auth', createAuthRoutes())
  if (resolvedCustomersService) {
    app.route('/', createCustomersRoutes(resolvedCustomersService, resolvedUsersService))
  }
  const resolvedCategoriesService = db ? new CategoriesService(new CategoriesRepository(db), getCacheProvider()) : undefined
  const resolvedCollectionsService = db ? new CollectionsService(new CollectionsRepository(db), getCacheProvider()) : undefined

  const resolvedProductTypeService = db ? new ProductTypeService(new ProductTypeRepository(db)) : undefined

  if (resolvedCatalogService) {
    app.route('/', createCatalogRoutes(resolvedCatalogService))
  }
  if (resolvedProductTypeService) {
    app.route('/', createProductTypeRoutes(resolvedProductTypeService))
  }
  if (resolvedCategoriesService && resolvedCustomersService) {
    app.route('/', createCategoriesRoutes(resolvedCategoriesService, resolvedCustomersService))
  }
  if (resolvedCollectionsService && resolvedCustomersService) {
    app.route('/', createCollectionsRoutes(resolvedCollectionsService, resolvedCustomersService))
  }
  if (resolvedMediaService && resolvedCustomersService) {
    app.route('/', createMediaRoutes(resolvedMediaService))
  }
  if (resolvedInventoryService) {
    app.route('/', createInventoryRoutes(resolvedInventoryService))
  }
  if (resolvedShippingService) {
    app.route('/', createShippingRoutes(resolvedShippingService))
  }
  if (resolvedOrdersService && resolvedCustomersService) {
    app.route('/', createOrdersRoutes(resolvedOrdersService, resolvedCustomersService))
  }
  if (resolvedPaymentsService && resolvedCustomersService) {
    app.route('/', createPaymentsRoutes(resolvedPaymentsService, resolvedCustomersService))
  }
  if (resolvedPartnerService && resolvedCustomersService) {
    app.route('/', createPartnerRoutes(resolvedPartnerService, resolvedCustomersService))
  }

  if (resolvedCartService && resolvedCustomersService) {
    app.route('/', createCartRoutes(resolvedCartService, resolvedCustomersService))
  }
  if (resolvedSupportService && resolvedCustomersService) {
    app.route('/', createSupportRoutes(resolvedSupportService, resolvedCustomersService))
  }
  if (resolvedBlogsService && resolvedCustomersService) {
    app.route('/', createBlogsRoutes(resolvedBlogsService, resolvedCustomersService))
  }
  if (resolvedAnalyticsService && resolvedCustomersService) {
    app.route('/', createAnalyticsRoutes(resolvedAnalyticsService, resolvedCustomersService))
  }
  if (resolvedDeliveryService && resolvedCustomersService) {
    app.route('/', createDeliveryRoutes(resolvedDeliveryService, resolvedCustomersService))
  }

  if (resolvedPincodeService) {
    app.route('/', createPincodeRoutes(resolvedPincodeService))
  }
  if (resolvedActivityLogService && resolvedCustomersService) {
    app.route('/', createActivityLogRoutes(resolvedActivityLogService, resolvedCustomersService))
    const events = getEventPublisher()
    if (events.subscribe) {
      events.subscribe('order.created', async (payload: any) => {
        if (payload?.tenantId && payload?.orderId) {
          try {
            await resolvedActivityLogService.recordAsync(payload.tenantId, {
              entityType: 'ORDER',
              entityId: payload.orderId,
              actorType: 'SYSTEM',
              eventType: 'order.created',
              title: 'Order Created',
              description: `Order ${payload.orderId} was created`,
              metadata: payload,
            })
          } catch (err) {
            console.error('[ActivityLog Event Error]:', err)
          }
        }
      })
    }
  }
  if (resolvedNotificationsService) {
    app.route('/internal/jobs/notifications', createNotificationJobs(resolvedNotificationsService))
  }

  return app
}

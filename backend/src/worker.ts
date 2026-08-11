import { createApp } from './lib/app.js'
import { initializeEnvSource } from './lib/env.js'
import { getDatabase } from './lib/db.js'
import { TenancyService } from './layers/tenancy/tenancy.service.js'
import { DrizzleTenancyRepository } from './layers/tenancy/tenancy.repository.js'
import {
  AddressRepository,
  CustomerRepository,
  GuestSessionRepository,
  PasswordResetRepository,
  RefreshTokenRepository,
} from './modules/customers/customers.repository.js'
import { CustomersService } from './modules/customers/customers.service.js'
import { CatalogRepository } from './modules/catalog/catalog.repository.js'
import { CatalogService } from './modules/catalog/catalog.service.js'
import { CatalogSearchService } from './modules/catalog/search.service.js'
import { MediaRepository } from './modules/media/media.repository.js'
import { MediaService } from './modules/media/media.service.js'
import { InventoryRepository } from './modules/inventory/inventory.repository.js'
import { InventoryService } from './modules/inventory/inventory.service.js'
import { createInventoryReleaseScheduler } from './modules/inventory/inventory.jobs.js'
import { PartnerRepository } from './modules/partner/partner.repository.js'
import { ShippingRepository } from './modules/shipping/shipping.repository.js'
import { ShippingService } from './modules/shipping/shipping.service.js'
import { getCacheProvider } from './providers/cache/cache.factory.js'
import { getStorageProvider } from './providers/storage/storage.factory.js'
import { CartRepository } from './modules/cart/cart.repository.js'
import { CartService } from './modules/cart/cart.service.js'
import { createCartExpiryScheduler } from './modules/cart/cart.jobs.js'
import { getJobQueueProvider } from './providers/queue/queue.factory.js'
import { getNotificationProvider } from './providers/notification/notification.factory.js'
import { NotificationsService } from './modules/notifications/notifications.service.js'
import { getOptionalEnv, requireEnv } from './lib/env.js'
import { DeliveryService } from './modules/delivery/delivery.service.js'

export default {
  async fetch(request: Request, env: any, ctx: any) {
    // 1. Initialize Env
    initializeEnvSource(env)

    const dbUrl = env.DATABASE_URL || getOptionalEnv('DATABASE_URL') || env.HYPERDRIVE?.connectionString
    const db = getDatabase(dbUrl)
    const cacheProvider = getCacheProvider()
    const storageProvider = getStorageProvider(env)
    const notificationProvider = getNotificationProvider()
    const jobQueueProvider = getJobQueueProvider()
    
    const rawApiBaseUrl = getOptionalEnv('API_BASE_URL') || 'http://localhost:8787'
    let apiBaseUrl = rawApiBaseUrl.trim().replace(/\/$/, '')
    if (!apiBaseUrl.startsWith('http')) {
      apiBaseUrl = apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')
        ? `http://${apiBaseUrl}`
        : `https://${apiBaseUrl}`
    }
    
    const notificationsService = notificationProvider ? new NotificationsService(
      notificationProvider,
      jobQueueProvider,
      { jobUrl: `${apiBaseUrl}/internal/jobs/notifications/email` }
    ) : undefined

    // 3. Initialize Repositories
    const customerRepository = new CustomerRepository(db)
    const addressRepository = new AddressRepository(db)
    const tenancyRepository = new DrizzleTenancyRepository(db)
    const guestSessionRepository = new GuestSessionRepository(db)
    const refreshTokenRepository = new RefreshTokenRepository(db)
    const passwordResetRepository = new PasswordResetRepository(db)
    const catalogRepository = new CatalogRepository(db)
    const inventoryRepository = new InventoryRepository(db)
    const partnerRepository = new PartnerRepository(db)
    const shippingRepository = new ShippingRepository(db)
    const mediaRepository = new MediaRepository(db)

    // 4. Initialize Core Services
    const tenancyService = new TenancyService(
      tenancyRepository,
      customerRepository,
      cacheProvider
    )

    const inventoryService = new InventoryService(
      inventoryRepository,
      createInventoryReleaseScheduler(getJobQueueProvider(), {
        url: `${(getOptionalEnv('API_BASE_URL') || 'http://localhost:8787').replace(/\/$/, '')}/internal/jobs/inventory/release`,
      })
    )
    const shippingService = new ShippingService(shippingRepository)

    const cartService = new CartService(
      new CartRepository(db),
      inventoryService,
      shippingService,
      cacheProvider,
      createCartExpiryScheduler(getJobQueueProvider(), {
        url: `${apiBaseUrl}/internal/jobs/cart/expiry`,
      }),
      undefined,
      async (tenantId) => tenancyService.getTenantContext(tenantId),
    )

    const customersService = new CustomersService(
      customerRepository,
      addressRepository,
      guestSessionRepository,
      refreshTokenRepository,
      passwordResetRepository,
      undefined,
      cartService,
      tenancyService
    )

    const catalogSearchService = new CatalogSearchService(catalogRepository, env.SEARCH_KV)
    const catalogService = new CatalogService(
      catalogRepository,
      inventoryService,
      partnerRepository,
      storageProvider,
      cacheProvider,
      catalogSearchService
    )

    const deliveryService = new DeliveryService(db)
    const mediaService = new MediaService(mediaRepository, storageProvider)

    // 5. Create App Instance (Fresh for this request)
    const app = createApp({
      tenancyService,
      db,
      customersService,
      catalogService,
      inventoryService,
      shippingService,
      cartService,
      notificationsService,
      deliveryService,
      mediaService,
    })

    // 6. Handle Request
    return app.fetch(request, env, ctx)
  }
}

import { randomBytes, createHash } from 'crypto'
import { getOptionalEnv } from '../../lib/env.js'
import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { PaginatedResult } from '../../lib/types.js'
import { catalogListKey, productCacheKey, categoryCacheKey } from '../../lib/redis-keys.js'
import { productImagePath } from '../../lib/storage-paths.js'
import type { CacheProvider } from '../../providers/cache/cache.interface.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import type { StorageProvider } from '../../providers/storage/storage.interface.js'
import { AuthorizationService } from '../../layers/authorization/authorization.service.js'
import { CatalogRepository } from './catalog.repository.js'
import { CatalogSearchService } from './search.service.js'
import { InventoryRepository } from '../inventory/inventory.repository.js'
import type { InventoryService } from '../inventory/inventory.service.js'
import type { PartnerRepository } from '../partner/partner.repository.js'
import type {
  CatalogCategory,
  CatalogActor,
  CatalogImage,
  CatalogProduct,
  CatalogProductWithDetails,
  CatalogProductSummaryWithDetails,
  CatalogVariantSummary,
  CatalogVariant,
  CreateProductInput,
  ProductListFilters,
  PublicProductFilters,
  UpdateProductInput,
  UpdateVariantInput,
  UploadImageInput,
  CatalogCollection,
} from './catalog.types.js'
import { slugify } from '../../lib/slug.js'

const generateSku = (title: string, partnerId?: string | null) => {
  const prefix = partnerId ? partnerId.slice(0, 4).toUpperCase() : 'PLAT'
  const namePart = title
    .trim()
    .toUpperCase()
    .replace(/[&]/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '-')
    .slice(0, 10)
  const randomPart = randomBytes(3).toString('hex').toUpperCase()
  return `${prefix}-${namePart}-${randomPart}`
}

const ensureNonEmptySlug = (value: string, fallback: string) => {
  const slug = slugify(value)
  if (!slug) {
    return slugify(fallback)
  }
  return slug
}

const PRODUCT_CACHE_TTL_SECONDS = 60 * 5
const CATEGORY_TREE_CACHE_TTL_SECONDS = 60 * 10
const LIST_CACHE_TTL_SECONDS = 60 * 2

export class CatalogService {
  private readonly auth: AuthorizationService

  constructor(
    private readonly repository: CatalogRepository,
    private readonly inventoryService?: InventoryService,
    private readonly partnerRepository?: PartnerRepository,
    private readonly storage?: StorageProvider,
    private readonly cache?: CacheProvider,
    private readonly searchService?: CatalogSearchService,
    private readonly events?: EventPublisher,
    authService?: AuthorizationService,
  ) {
    this.auth = authService ?? new AuthorizationService()
  }

  async createProduct(
    input: CreateProductInput,
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<CatalogProductWithDetails> {
    const scopedInput = this.auth.scopeProductInputForActor(input, actor)
    scopedInput.partnerId = await this.resolveVendorIdForCreation(tenantId, scopedInput.partnerId)
    if (!scopedInput.approvalStatus) {
      scopedInput.approvalStatus = (!actor || actor.isAdmin || actor.isSuperAdmin) ? 'APPROVED' : 'PENDING'
    }
    const baseSlug = ensureNonEmptySlug(input.slug ?? input.title, input.title)
    
    // Auto-generate SKUs if missing or requested
    for (const variant of scopedInput.variants) {
      if (!variant.sku || variant.sku === 'AUTO') {
        variant.sku = generateSku(input.title, scopedInput.partnerId)
      }
    }

    this.ensureVariantPayload(scopedInput.variants)
    
    const [slug] = await Promise.all([
      this.generateUniqueSlug(tenantId, baseSlug),
      this.ensureVariantSkusAvailable(tenantId, scopedInput.variants.map((variant) => variant.sku)),
    ])

    const result = await this.repository.transaction(async (repository) => {
      const created = await repository.createProduct(tenantId, { ...scopedInput, slug })
      const createdVariants = await repository.createVariants(tenantId, created.id, this.normalizeVariants(scopedInput.variants))
      
      // Create inventory records and build variant response with inventory data inline
      const variantsWithInventory = await Promise.all(
        createdVariants.map(async (variant, i) => {
          const variantInput = scopedInput.variants[i]
          const qty = variantInput.availableQuantity ?? 0
          const backorder = variantInput.allowBackorder ?? !variant.trackInventory
          if (this.inventoryService && repository.db) {
            const inventoryRepo = new InventoryRepository(repository.db)
            await inventoryRepo.createInventoryRecord(tenantId, {
              variantId: variant.id,
              partnerId: created.partnerId,
              quantityAvailable: qty,
              allowBackorder: backorder,
            })
          }
          return { ...variant, availableQuantity: qty, allowBackorder: backorder }
        })
      )

      let resolvedCollectionIds = scopedInput.collectionIds ?? []
      if (scopedInput.collections && scopedInput.collections.length > 0) {
        const generatedIds = await this.resolveCollectionIdsFromNames(tenantId, repository, scopedInput.collections)
        resolvedCollectionIds = [...new Set([...resolvedCollectionIds, ...generatedIds])]
      }

      await Promise.all([
        repository.setProductCategories(tenantId, created.id, scopedInput.categoryIds ?? []),
        repository.setProductCollections(tenantId, created.id, resolvedCollectionIds),
      ])

      // Fetch the entity objects we just associated
      const [fetchedCategories, fetchedCollections, vendor] = await Promise.all([
        (scopedInput.categoryIds?.length)
          ? repository.getCategoriesForProduct(tenantId, created.id)
          : Promise.resolve([]),
        (resolvedCollectionIds.length)
          ? repository.getCollectionsForProduct(tenantId, created.id)
          : Promise.resolve([]),
        created.partnerId && this.partnerRepository
          ? this.partnerRepository.findPartnerById(tenantId, created.partnerId)
          : Promise.resolve(null),
      ])

      return {
        product: created,
        variantsWithInventory,
        categories: fetchedCategories,
        collections: fetchedCollections,
        vendor,
      }
    })

    const { product, variantsWithInventory, categories: cats, collections: cols, vendor: vnd } = result
    const categoriesChanged = !!scopedInput.categoryIds?.length
    await this.invalidateProductCaches(tenantId, product.id, slug, undefined, categoriesChanged)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    await this.events?.publish('product.created', { tenantId, productId: product.id, slug })
    logger.info({ tenantId, productId: product.id, slug }, 'catalog product created')

    const hydrated: CatalogProductWithDetails = {
      ...product,
      vendorName: vnd?.name ?? (product.partnerId ? 'Unknown Vendor' : null),
      variants: variantsWithInventory,
      images: [], // freshly created product has no images
      categories: cats,
      collections: cols,
    }
    await this.cache?.set(this.productCacheKeyById(tenantId, product.id), hydrated, PRODUCT_CACHE_TTL_SECONDS)
    return hydrated
  }

  async updateProduct(
    productId: string,
    input: UpdateProductInput,
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<CatalogProductWithDetails> {
    const existing = await this.repository.findProductById(tenantId, productId)
    if (!existing) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(existing, actor)

    const scopedInput = this.auth.scopeProductUpdateForActor(input, existing.partnerId, actor)

    let nextSlug =
      scopedInput.slug !== undefined
          ? ensureNonEmptySlug(scopedInput.slug, scopedInput.title ?? existing.title)
          : undefined
    if (nextSlug && nextSlug !== existing.slug) {
      nextSlug = await this.generateUniqueSlug(tenantId, nextSlug)
    }

    const result = await this.repository.transaction(async (repository) => {
      const updated = await repository.updateProduct(tenantId, productId, { ...scopedInput, slug: nextSlug })
      
      const dbOps: Promise<any>[] = []
      if (scopedInput.categoryIds) {
        dbOps.push(repository.setProductCategories(tenantId, productId, scopedInput.categoryIds))
      }
      if (scopedInput.collections !== undefined) {
        dbOps.push(
          (async () => {
            const resolvedCollectionIds = await this.resolveCollectionIdsFromNames(tenantId, repository, scopedInput.collections!)
            await repository.setProductCollections(tenantId, productId, resolvedCollectionIds)
          })()
        )
      } else if (scopedInput.collectionIds) {
        dbOps.push(repository.setProductCollections(tenantId, productId, scopedInput.collectionIds))
      }
      if (dbOps.length > 0) {
        await Promise.all(dbOps)
      }

      if (scopedInput.variants && scopedInput.variants.length > 0) {
        const existingVariants = await repository.findVariantsByProductId(tenantId, productId)
        const existingById = new Map(existingVariants.map(v => [v.id, v]))
        const existingBySku = new Map(existingVariants.map(v => [v.sku, v]))

        // Validate SKU availability for new/changed SKUs
        const skusToCheck: string[] = []
        for (const variantInput of scopedInput.variants) {
          if (!variantInput.sku || variantInput.sku === 'AUTO') {
            variantInput.sku = generateSku(existing.title, existing.partnerId)
          }

          const target = variantInput.id
            ? existingById.get(variantInput.id)
            : existingBySku.get(variantInput.sku)

          if (!target || (variantInput.sku && variantInput.sku !== target.sku)) {
            skusToCheck.push(variantInput.sku)
          }
        }
        if (skusToCheck.length > 0) {
          await this.ensureVariantSkusAvailable(tenantId, skusToCheck)
        }

        for (const variantInput of scopedInput.variants) {
          const target = variantInput.id
            ? existingById.get(variantInput.id)
            : existingBySku.get(variantInput.sku)

          if (target) {
            // Update existing — strip id from the update payload
            const { id: _, sku, availableQuantity, allowBackorder, ...variantUpdate } = variantInput
            // Allow SKU change if matched by ID and changed
            if (variantInput.id && sku && sku !== target.sku) {
              (variantUpdate as any).sku = sku
            }
            await repository.updateVariant(tenantId, target.id, variantUpdate)

            if (this.inventoryService && (availableQuantity !== undefined || allowBackorder !== undefined)) {
              const inventoryUpdate: any = {}
              if (availableQuantity !== undefined) inventoryUpdate.quantityAvailable = availableQuantity
              if (allowBackorder !== undefined) inventoryUpdate.allowBackorder = allowBackorder
              await this.inventoryService.updateStock(tenantId, target.id, inventoryUpdate)
            }
          } else {
            // New variant — create it
            const [created] = await repository.createVariants(tenantId, productId, this.normalizeVariants([variantInput]))
            // Create inventory record for new variant
            if (this.inventoryService && repository.db) {
              const inventoryRepo = new InventoryRepository(repository.db)
              await inventoryRepo.createInventoryRecord(tenantId, {
                variantId: created.id,
                partnerId: existing.partnerId,
                quantityAvailable: variantInput.availableQuantity ?? 0,
                allowBackorder: variantInput.allowBackorder ?? !created.trackInventory,
              })
            }
          }
        }
      }

      const [variants, images, categories, collections, vendor] = await Promise.all([
        repository.findVariantsWithInventoryByProductId(tenantId, productId, false),
        repository.listImagesForProduct(tenantId, productId),
        repository.getCategoriesForProduct(tenantId, productId),
        repository.getCollectionsForProduct(tenantId, productId),
        updated.partnerId && this.partnerRepository
          ? this.partnerRepository.findPartnerById(tenantId, updated.partnerId)
          : Promise.resolve(null)
      ])

      return {
        updated,
        hydrated: {
          ...updated,
          vendorName: vendor?.name ?? (updated.partnerId ? 'Unknown Vendor' : null),
          variants,
          images,
          categories,
          collections,
        }
      }
    })

    const { updated, hydrated } = result
    const categoriesChanged = scopedInput.categoryIds !== undefined
    await this.invalidateProductCaches(tenantId, productId, existing.slug, updated.slug, categoriesChanged)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    await this.events?.publish('product.updated', {
      tenantId,
      productId,
      previousSlug: existing.slug,
      slug: updated.slug,
    })
    logger.info({ tenantId, productId, previousSlug: existing.slug, slug: updated.slug }, 'catalog product updated')

    await this.cache?.set(this.productCacheKeyById(tenantId, productId), hydrated, PRODUCT_CACHE_TTL_SECONDS)
    return hydrated
  }

  async listProducts(
    tenantId: string,
    filters: ProductListFilters = {},
    actor?: CatalogActor,
  ): Promise<PaginatedResult<CatalogProductSummaryWithDetails>> {
    if (actor) {
      this.auth.assertSameTenant(actor, tenantId)
    }
    const scopedFilters = this.auth.scopeProductListFiltersForActor(filters, actor)
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const cacheKey = this.listCacheKey(tenantId, {
      page,
      perPage,
      status: scopedFilters.status ?? null,
      categorySlug: scopedFilters.categorySlug ?? null,
      includeDeleted: scopedFilters.includeDeleted ?? false,
      partnerId: scopedFilters.partnerId ?? null,
      productTypeId: scopedFilters.productTypeId ?? null,
      search: scopedFilters.search ?? null,
      approvalStatus: scopedFilters.approvalStatus ?? null,
      hasVendor: scopedFilters.hasVendor ?? false,
      summary: scopedFilters.summary ?? false,
      isPublic: scopedFilters.isPublic ?? false,
      catalogType: scopedFilters.catalogType ?? 'REGULAR',
    })
    const cached = await this.cache?.get<PaginatedResult<CatalogProductSummaryWithDetails>>(cacheKey)
    if (cached) {
      return cached
    }

    const base = await this.repository.listProducts(tenantId, scopedFilters)
    if (base.items.length === 0) {
      return { items: [] as CatalogProductSummaryWithDetails[], page, perPage, total: base.total }
    }

    // BATCH HYDRATION
    const productIds = base.items.map((i) => i.id)
    const vendorIds = [...new Set(base.items.map((i) => i.partnerId).filter(Boolean) as string[])]

    const [variantsWithInventory, images, productCategories, productCollectionsList, vendorListResults] = await Promise.all([
      scopedFilters.summary 
        ? this.repository.findDefaultVariantsWithInventoryByProductIds(tenantId, productIds, !!scopedFilters.includeDeleted)
        : this.repository.findVariantsWithInventoryByProductIds(tenantId, productIds, !!scopedFilters.includeDeleted),
      scopedFilters.summary
        ? this.repository.listPrimaryImagesForProducts(tenantId, productIds)
        : this.repository.listImagesForProducts(tenantId, productIds),
      this.repository.getCategoriesForProducts(tenantId, productIds),
      this.repository.getCollectionsForProducts(tenantId, productIds),
      this.partnerRepository ? (this.partnerRepository as any).findPartnersByIds(tenantId, vendorIds) : Promise.resolve([])
    ])

    const variantsByProduct = new Map<string, CatalogVariant[]>()
    variantsWithInventory.forEach((v: any) => {
      const group = variantsByProduct.get(v.productId) ?? []
      group.push(v)
      variantsByProduct.set(v.productId, group)
    })

    const imagesByProduct = new Map<string, CatalogImage[]>()
    images.forEach((img: any) => {
      const group = imagesByProduct.get(img.productId) ?? []
      group.push(img)
      imagesByProduct.set(img.productId, group)
    })

    const categoriesByProduct = new Map<string, CatalogCategory[]>()
    productCategories.forEach(({ productId, category }: any) => {
      const group = categoriesByProduct.get(productId) ?? []
      group.push(category)
      categoriesByProduct.set(productId, group)
    })

    const collectionsByProduct = new Map<string, CatalogCollection[]>()
    productCollectionsList.forEach(({ productId, collection }: any) => {
      const group = collectionsByProduct.get(productId) ?? []
      group.push(collection)
      collectionsByProduct.set(productId, group)
    })

    const partnersList = (vendorListResults.filter(Boolean) as any[])
    const vendorMap = new Map(partnersList.map((v) => [v.id, v.name]))

    const items: CatalogProductSummaryWithDetails[] = base.items.map((product) => ({
      ...product,
      vendorName: product.partnerId ? vendorMap.get(product.partnerId) ?? null : null,
      variants: variantsByProduct.get(product.id) ?? [],
      images: imagesByProduct.get(product.id) ?? [],
      categories: categoriesByProduct.get(product.id) ?? [],
      collections: collectionsByProduct.get(product.id) ?? [],
    }))

    const result = {
      items,
      page,
      perPage,
      total: base.total,
    }
    await this.cache?.set(cacheKey, result, LIST_CACHE_TTL_SECONDS)
    return result
  }

  async listPublicProducts(
    tenantId: string,
    filters: PublicProductFilters = {},
  ): Promise<PaginatedResult<CatalogProductSummaryWithDetails>> {
    return this.listProducts(tenantId, {
      page: filters.page,
      perPage: filters.perPage,
      status: 'active',
      categorySlug: filters.categorySlug,
      includeDeleted: false,
      isPublic: true,
    })
  }

  async getProduct(
    productId: string,
    tenantId: string,
    includeDeleted = true,
    actor?: CatalogActor,
  ): Promise<CatalogProductWithDetails> {
    const useCache = !includeDeleted
    const cacheKey = useCache ? this.productCacheKeyById(tenantId, productId) : null
    if (cacheKey) {
      const cached = await this.cache?.get<CatalogProductWithDetails>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const product = await this.repository.findProductById(tenantId, productId)
    if (!product || (!includeDeleted && product.deletedAt)) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    const hydrated = await this.hydrateProduct(tenantId, product, includeDeleted)
    if (cacheKey) {
      await this.cache?.set(cacheKey, hydrated, PRODUCT_CACHE_TTL_SECONDS)
    }
    return hydrated
  }

  async getProductBySlug(tenantId: string, slug: string): Promise<CatalogProductWithDetails> {
    const cacheKey = productCacheKey(tenantId, slug)
    const cached = await this.cache?.get<CatalogProductWithDetails>(cacheKey)
    if (cached) {
      return cached
    }

    const product = await this.repository.findProductBySlug(tenantId, slug)
    if (!product || product.deletedAt || product.status !== 'active') {
      throw new AppError('Product not found', 404, 'product-not-found')
    }

    // Block products from unapproved or suspended vendors
    let preFetchedVendor: { id: string; name: string } | null = null
    if (product.partnerId) {
      if (product.approvalStatus !== 'APPROVED') {
        throw new AppError('Product not found', 404, 'product-not-found')
      }

      if (this.partnerRepository) {
        const partner = await this.partnerRepository.findPartnerById(tenantId, product.partnerId)
        if (!partner || partner.status !== 'active' || partner.deletedAt) {
          throw new AppError('Product not found', 404, 'product-not-found')
        }
        preFetchedVendor = partner
      }
    }

    const hydrated = await this.hydrateProduct(tenantId, product, false, preFetchedVendor)
    await this.cache?.set(cacheKey, hydrated, PRODUCT_CACHE_TTL_SECONDS)
    await this.cache?.set(this.productCacheKeyById(tenantId, product.id), hydrated, PRODUCT_CACHE_TTL_SECONDS)
    return hydrated
  }

  async softDeleteProduct(
    productId: string,
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<void> {
    const product = await this.repository.findProductById(tenantId, productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)
    await this.repository.softDeleteProduct(tenantId, productId)
    await this.invalidateProductCaches(tenantId, productId, product.slug, undefined, true)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    await this.events?.publish('product.deleted', { tenantId, productId, slug: product.slug })
    logger.info({ tenantId, productId, slug: product.slug }, 'catalog product deleted')
  }

  async softDeleteProducts(
    productIds: string[],
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<void> {
    if (productIds.length === 0) return
    if (actor) {
      this.auth.assertSameTenant(actor, tenantId)
    }

    const matchingProducts = await this.repository.findProductsByIds(tenantId, productIds)
    if (matchingProducts.length === 0) {
      throw new AppError('No matching products found', 404, 'products-not-found')
    }

    for (const product of matchingProducts) {
      this.auth.assertCanManageProduct(product, actor)
    }

    const fetchedIds = matchingProducts.map((p) => p.id)
    await this.repository.softDeleteProducts(tenantId, fetchedIds)

    await Promise.all(
      matchingProducts.flatMap((product) => [
        this.invalidateProductCaches(tenantId, product.id, product.slug, undefined, true),
        this.events?.publish('product.deleted', { tenantId, productId: product.id, slug: product.slug }) ?? Promise.resolve(),
      ])
    )

    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    logger.info({ tenantId, productIds: fetchedIds }, 'catalog products bulk deleted')
  }

  async addVariant(
    productId: string,
    input: CreateProductInput['variants'][number],
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<CatalogVariant> {
    const product = await this.repository.findProductById(tenantId, productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    this.ensureVariantPayload([input])
    await this.ensureVariantSkusAvailable(tenantId, [input.sku])

    const variant = await this.repository.transaction(async (repository) => {
      const [createdVariant] = await repository.createVariants(tenantId, productId, this.normalizeVariants([input]))
      
      if (this.inventoryService && repository.db) {
        const inventoryRepo = new InventoryRepository(repository.db)
        await inventoryRepo.createInventoryRecord(tenantId, {
          variantId: createdVariant.id,
          partnerId: product.partnerId,
          quantityAvailable: input.availableQuantity ?? 0,
          allowBackorder: input.allowBackorder ?? !createdVariant.trackInventory,
        })
      }
      return createdVariant
    })

    await this.invalidateProductCaches(tenantId, productId, product.slug)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    logger.info({ tenantId, productId, variantId: variant.id, sku: variant.sku }, 'catalog variant created')
    return variant
  }

  async updateVariant(
    variantId: string,
    input: UpdateVariantInput,
    tenantId: string,
    changedBy?: string,
    actor?: CatalogActor,
  ): Promise<CatalogVariant> {
    const existing = await this.repository.findVariantById(tenantId, variantId)
    if (!existing || existing.deletedAt) {
      throw new AppError('Variant not found', 404, 'variant-not-found')
    }
    const product = await this.repository.findProductById(tenantId, existing.productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    if (input.sku && input.sku !== existing.sku) {
      const conflict = await this.repository.findVariantBySku(tenantId, input.sku)
      if (conflict && conflict.id !== variantId) {
        throw new AppError('Variant SKU already exists', 409, 'variant-sku-conflict')
      }
    }

    const { availableQuantity, allowBackorder, ...variantUpdate } = input
    const updated = await this.repository.updateVariant(tenantId, variantId, variantUpdate)
    
    if (this.inventoryService && (availableQuantity !== undefined || allowBackorder !== undefined)) {
      const inventoryUpdate: { quantityAvailable?: number; allowBackorder?: boolean } = {}
      if (availableQuantity !== undefined) inventoryUpdate.quantityAvailable = availableQuantity
      if (allowBackorder !== undefined) inventoryUpdate.allowBackorder = allowBackorder
      await this.inventoryService.updateStock(tenantId, variantId, inventoryUpdate)
    }
    const nextPrice = input.price
    if (typeof nextPrice === 'number' && nextPrice !== existing.price) {
      await this.repository.insertPriceHistory(tenantId, variantId, existing.price, nextPrice, changedBy)
    }
    if (product) {
      await this.invalidateProductCaches(tenantId, existing.productId, product.slug)
      if (this.searchService) {
        try {
          await this.searchService.syncTenantIndex(tenantId)
        } catch (err) {
          logger.error({ err, tenantId }, 'failed to sync search index')
        }
      }
    }
    logger.info({ tenantId, variantId, productId: existing.productId }, 'catalog variant updated')

    return updated
  }

  async deleteVariant(variantId: string, tenantId: string, actor?: CatalogActor): Promise<void> {
    const variant = await this.repository.findVariantById(tenantId, variantId)
    if (!variant || variant.deletedAt) {
      throw new AppError('Variant not found', 404, 'variant-not-found')
    }
    const product = await this.repository.findProductById(tenantId, variant.productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    const totalActive = await this.repository.countActiveVariantsForProduct(tenantId, variant.productId)
    if (totalActive <= 1) {
      throw new AppError('Cannot delete the last variant', 400, 'last-variant-protected')
    }

    await this.repository.softDeleteVariant(tenantId, variantId)
    if (product) {
      await this.invalidateProductCaches(tenantId, variant.productId, product.slug)
      if (this.searchService) {
        try {
          await this.searchService.syncTenantIndex(tenantId)
        } catch (err) {
          logger.error({ err, tenantId }, 'failed to sync search index')
        }
      }
    }
    logger.info({ tenantId, variantId, productId: variant.productId }, 'catalog variant deleted')
  }

  async getProductsByCategorySlug(
    tenantId: string,
    slug: string,
    filters: PublicProductFilters = {},
  ): Promise<PaginatedResult<CatalogProductSummaryWithDetails>> {
    return this.listPublicProducts(tenantId, { ...filters, categorySlug: slug })
  }

  async associateImage(
    tenantId: string,
    productId: string,
    input: { mediaId: string; variantId?: string | null; altText?: string | null; position?: number },
    actor?: CatalogActor,
  ): Promise<CatalogImage> {
    const product = await this.repository.findProductById(tenantId, productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    const image = await this.repository.createImageRecord(tenantId, {
      productId,
      variantId: input.variantId,
      mediaId: input.mediaId,
      altText: input.altText,
      position: input.position,
    })
    await this.invalidateProductCaches(tenantId, productId, product.slug)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    logger.info({ tenantId, productId, imageId: image.id }, 'catalog image associated')
    return image
  }

  async deleteImage(imageId: string, tenantId: string, actor?: CatalogActor): Promise<void> {
    const image = await this.repository.findImageById(tenantId, imageId)
    if (!image) {
      throw new AppError('Image not found', 404, 'image-not-found')
    }
    const product = await this.repository.findProductById(tenantId, image.productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    // Deleting from product only removes the association in product_images
    await this.repository.deleteImage(tenantId, imageId)
    await this.invalidateProductCaches(tenantId, image.productId, product.slug)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    logger.info({ tenantId, imageId, productId: image.productId }, 'catalog image association deleted')
  }

  async updateImage(
    imageId: string,
    input: { variantId?: string | null; position?: number; altText?: string | null },
    tenantId: string,
    actor?: CatalogActor,
  ): Promise<CatalogImage> {
    const image = await this.repository.findImageById(tenantId, imageId)
    if (!image) {
      throw new AppError('Image not found', 404, 'image-not-found')
    }
    const product = await this.repository.findProductById(tenantId, image.productId)
    if (!product) {
      throw new AppError('Product not found', 404, 'product-not-found')
    }
    this.auth.assertCanManageProduct(product, actor)

    const updated = await this.repository.updateImage(tenantId, imageId, input)
    await this.invalidateProductCaches(tenantId, image.productId, product.slug)
    if (this.searchService) {
      try {
        await this.searchService.syncTenantIndex(tenantId)
      } catch (err) {
        logger.error({ err, tenantId }, 'failed to sync search index')
      }
    }
    logger.info({ tenantId, imageId, productId: image.productId }, 'catalog image updated')
    return updated
  }

  async getVariantSummary(tenantId: string, variantId: string): Promise<CatalogVariantSummary> {
    const summary = await this.repository.getVariantSummary(tenantId, variantId)
    if (!summary) {
      throw new AppError('Variant not found', 404, 'variant-not-found')
    }
    return summary
  }

  private async hydrateProduct(
    tenantId: string,
    product: CatalogProduct,
    includeDeleted: boolean,
    preFetchedVendor?: any,
  ): Promise<CatalogProductWithDetails> {
    const productId = product.id

    const [variants, images, categories, collections, vendor] = await Promise.all([
      this.repository.findVariantsWithInventoryByProductId(tenantId, productId, false),
      this.repository.listImagesForProduct(tenantId, productId),
      this.repository.getCategoriesForProduct(tenantId, productId),
      this.repository.getCollectionsForProduct(tenantId, productId),
      preFetchedVendor
        ? Promise.resolve(preFetchedVendor)
        : (product.partnerId && this.partnerRepository 
            ? this.partnerRepository.findPartnerById(tenantId, product.partnerId) 
            : Promise.resolve(null))
    ])

    return {
      ...product,
      vendorName: vendor?.name ?? (product.partnerId ? 'Unknown Vendor' : null),
      variants,
      images,
      categories,
      collections,
    }
  }

  private async resolveCollectionIdsFromNames(
    tenantId: string,
    repository: CatalogRepository,
    names: string[],
  ): Promise<string[]> {
    if (!names || names.length === 0) return []
    
    const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
    if (uniqueNames.length === 0) return []

    const nameSlugPairs = uniqueNames.map((name) => ({ name, slug: slugify(name) }))
    const slugs = nameSlugPairs.map((p) => p.slug)

    // 1. Fetch existing collections in a single query
    const existingCollections = await repository.findCollectionsBySlugs(tenantId, slugs)
    const existingMap = new Map(existingCollections.map((c: CatalogCollection) => [c.slug, c]))

    // 2. Identify missing collections
    const missingPairs = nameSlugPairs.filter((p) => !existingMap.has(p.slug))

    // 3. Batch insert missing ones in a single query
    let createdCollections: CatalogCollection[] = []
    if (missingPairs.length > 0) {
      createdCollections = await repository.createCollections(tenantId, missingPairs)
    }

    // 4. Combine and return IDs in the original requested order
    const allCollectionsMap = new Map([
      ...existingCollections.map((c: CatalogCollection) => [c.slug, c] as const),
      ...createdCollections.map((c: CatalogCollection) => [c.slug, c] as const),
    ])

    return nameSlugPairs
      .map((p) => allCollectionsMap.get(p.slug))
      .filter((c): c is CatalogCollection => !!c)
      .map((c) => c.id)
  }

  private normalizeVariants(input: CreateProductInput['variants']): CreateProductInput['variants'] {
    const hasExplicitDefault = input.some((variant) => variant.isDefault)
    return input.map((variant, index): CreateProductInput['variants'][number] => ({
      ...variant,
      attributes: variant.attributes ?? {},
      trackInventory: variant.trackInventory ?? true,
      isDefault: variant.isDefault ?? (!hasExplicitDefault && index === 0),
      position: variant.position ?? index,
    }))
  }

  private ensureVariantPayload(input: CreateProductInput['variants']): void {
    const defaults = input.filter((variant) => variant.isDefault)
    if (defaults.length > 1) {
      throw new AppError('Only one default variant is allowed', 400, 'multiple-default-variants')
    }
  }

  private async generateUniqueSlug(
    tenantId: string,
    baseSlug: string,
  ): Promise<string> {
    const candidates = [baseSlug]
    const randomSuffix = randomBytes(2).toString('hex')
    candidates.push(`${baseSlug}-${randomSuffix}`)
    for (let counter = 2; counter <= 10; counter++) {
      candidates.push(`${baseSlug}-${counter}`)
    }

    const existing = await this.repository.findProductsBySlugs(tenantId, candidates)
    const taken = new Set(existing.map((p) => p.slug))

    const available = candidates.find((slug) => !taken.has(slug))
    return available ?? `${baseSlug}-${Date.now().toString().slice(-4)}`
  }

  private async ensureVariantSkusAvailable(tenantId: string, skus: string[]): Promise<void> {
    const unique = new Set<string>()
    for (const sku of skus) {
      if (unique.has(sku)) {
        logger.warn({ tenantId, sku }, 'duplicate SKU in request payload')
        throw new AppError(`Duplicate SKU in request: ${sku}`, 409, 'variant-sku-conflict')
      }
      unique.add(sku)
    }

    const existing = await this.repository.listVariantsBySkus(tenantId, [...unique])
    const conflict = existing.find((variant) => !variant.deletedAt)
    if (conflict) {
      logger.warn({ tenantId, sku: conflict.sku }, 'variant SKU already exists in database')
      throw new AppError(`Variant SKU already exists: ${conflict.sku}`, 409, 'variant-sku-conflict')
    }
  }

  private async resolveVendorIdForCreation(tenantId: string, partnerId?: string | null): Promise<string> {
    if (partnerId) return partnerId
    if (this.partnerRepository) {
      const existingPartners = await this.partnerRepository.listPartners(tenantId, { page: 1, perPage: 1 })
      if (existingPartners.items.length > 0) {
        return existingPartners.items[0].id
      }
      const defaultPartner = await this.partnerRepository.createPartner(tenantId, {
        name: 'Default Store',
        slug: 'default-store',
        status: 'active',
      })
      return defaultPartner.id
    }
    return 'default-vendor-id'
  }

  private categoryTreeKey(tenantId: string): string {
    return categoryCacheKey(tenantId, 'tree')
  }

  private productCacheKeyById(tenantId: string, productId: string): string {
    return productCacheKey(tenantId, `id:${productId}`)
  }

  private async invalidateProductCaches(
    tenantId: string,
    productId: string,
    previousSlug?: string,
    nextSlug?: string,
    categoriesChanged = false,
  ): Promise<void> {
    const deletions: Promise<void>[] = [
      this.cache?.delete(this.productCacheKeyById(tenantId, productId)) ?? Promise.resolve(),
      this.cache?.deleteByPrefix(catalogListKey(tenantId, '')) ?? Promise.resolve(),
    ]
    if (categoriesChanged) {
      deletions.push(this.invalidateCategoryCaches(tenantId))
    }
    if (previousSlug) {
      deletions.push(this.cache?.delete(productCacheKey(tenantId, previousSlug)) ?? Promise.resolve())
    }
    if (nextSlug && nextSlug !== previousSlug) {
      deletions.push(this.cache?.delete(productCacheKey(tenantId, nextSlug)) ?? Promise.resolve())
    }
    await Promise.all(deletions)

    // Fire-and-forget storefront revalidation
    try {
      await this.triggerStorefrontRevalidation()
    } catch (err) {
      logger.error({ err }, 'failed to trigger storefront revalidation')
    }
  }

  private async triggerStorefrontRevalidation(): Promise<void> {
    const storefrontUrl = getOptionalEnv('STOREFRONT_URL')
    const secret = getOptionalEnv('REVALIDATION_SECRET')

    if (!storefrontUrl || !secret) {
      return
    }

    try {
      const url = `${storefrontUrl.replace(/\/+$/, '')}/api/revalidate`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidation-secret': secret,
        },
        body: JSON.stringify({ tag: 'products' }),
      })

      if (!response.ok) {
        logger.warn({ status: response.status }, 'storefront revalidation failed')
      }
    } catch (err) {
      // Log error but don't fail the primary operation
      logger.error({ err }, 'error calling storefront revalidation')
    }
  }

  private async invalidateCategoryCaches(
    tenantId: string,
    previousSlug?: string,
    nextSlug?: string,
  ): Promise<void> {
    const deletions: Promise<void>[] = [
      this.cache?.delete(this.categoryTreeKey(tenantId)) ?? Promise.resolve(),
      this.cache?.deleteByPrefix(catalogListKey(tenantId, '')) ?? Promise.resolve(),
    ]
    if (previousSlug) {
      deletions.push(this.cache?.delete(categoryCacheKey(tenantId, previousSlug)) ?? Promise.resolve())
    }
    if (nextSlug && nextSlug !== previousSlug) {
      deletions.push(this.cache?.delete(categoryCacheKey(tenantId, nextSlug)) ?? Promise.resolve())
    }
    await Promise.all(deletions)
  }

  private listCacheKey(
    tenantId: string,
    input: Record<string, string | number | boolean | null>,
  ): string {
    const normalized = Object.fromEntries(
      Object.entries(input).sort(([left], [right]) => left.localeCompare(right)),
    )
    const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16)
    return catalogListKey(tenantId, hash)
  }
}

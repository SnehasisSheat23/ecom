import { describe, expect, it, vi } from 'vitest'

import { CatalogService } from './catalog.service.js'
import type { CatalogActor, CatalogProduct, CatalogVariant, CatalogCategory, CatalogCollection } from './catalog.types.js'
import type { CatalogRepository } from './catalog.repository.js'
import {
  createProductSchema,
  createCategorySchema,
  createCollectionSchema,
  bulkDeleteProductsSchema,
  listProductsQuerySchema,
} from './catalog.validators.js'

const productFixture: CatalogProduct = {
  id: 'prod-1',
  tenantId: 'tenant-1',
  partnerId: 'vendor-1',
  productTypeId: null,
  title: 'Coffee Mug',
  slug: 'coffee-mug',
  description: null,
  shortDescription: null,
  status: 'active',
  productType: 'physical',
  catalogType: 'REGULAR',
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  taxClass: null,
  approvalStatus: 'APPROVED',
  rejectionReason: null,
  vendorCommissionOverride: null,
  specifications: {},
  options: [],
  tags: [],
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const variantFixture: CatalogVariant = {
  id: 'var-1',
  tenantId: 'tenant-1',
  productId: 'prod-1',
  sku: 'MUG-001',
  title: 'Default',
  price: 499,
  compareAtPrice: null,
  attributes: {},
  trackInventory: false,
  position: 0,
  isDefault: true,
  weightGrams: null,
  lengthMm: null,
  widthMm: null,
  heightMm: null,
  costPerItem: null,
  barcode: null,
  countryOfOrigin: null,
  hsCode: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const categoryFixture: CatalogCategory = {
  id: 'cat-1',
  tenantId: 'tenant-1',
  parentId: null,
  name: 'Drinkware',
  slug: 'drinkware',
  description: null,
  imageUrl: null,
  displayType: 'TREE',
  level: 0,
  sortOrder: 0,
  status: 'ACTIVE',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const collectionFixture: CatalogCollection = {
  id: 'coll-1',
  tenantId: 'tenant-1',
  name: 'New Arrivals',
  slug: 'new-arrivals',
  description: null,
  imageUrl: null,
  displayType: 'GRID',
  sortOrder: 0,
  status: 'ACTIVE',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const vendorActor: CatalogActor = {
  customerId: 'cust-1',
  tenantId: 'tenant-1',
  partnerMemberships: [{ partnerId: 'vendor-1', role: 'staff', status: 'active' }],
  activePartnerId: 'vendor-1',
  email: 'vendor@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const adminActor: CatalogActor = {
  customerId: 'admin-1',
  tenantId: 'tenant-1',
  partnerMemberships: [],
  activePartnerId: null,
  email: 'admin@example.com',
  isAdmin: true,
  isSuperAdmin: false,
}

const foreignVendorActor: CatalogActor = {
  customerId: 'cust-2',
  tenantId: 'tenant-1',
  partnerMemberships: [{ partnerId: 'vendor-2', role: 'staff', status: 'active' }],
  activePartnerId: 'vendor-2',
  email: 'vendor2@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const foreignTenantActor: CatalogActor = {
  customerId: 'cust-3',
  tenantId: 'tenant-2',
  partnerMemberships: [],
  activePartnerId: null,
  email: 'foreign@example.com',
  isAdmin: false,
  isSuperAdmin: false,
}

const buildRepository = () =>
  ({
    transaction: vi.fn().mockImplementation(async (callback) => callback(buildRepository())),
    createProduct: vi.fn().mockResolvedValue(productFixture),
    updateProduct: vi.fn().mockResolvedValue(productFixture),
    softDeleteProduct: vi.fn(),
    softDeleteProducts: vi.fn(),
    findProductById: vi.fn().mockResolvedValue(productFixture),
    findProductsByIds: vi.fn().mockResolvedValue([productFixture]),
    findProductBySlug: vi.fn().mockResolvedValue(productFixture),
    findProductsBySlugs: vi.fn().mockResolvedValue([]),
    listProducts: vi.fn().mockResolvedValue({ items: [productFixture], page: 1, perPage: 20, total: 1 }),
    createVariants: vi.fn().mockResolvedValue([variantFixture]),
    findVariantsByProductId: vi.fn().mockResolvedValue([variantFixture]),
    findVariantById: vi.fn().mockResolvedValue(variantFixture),
    findVariantBySku: vi.fn().mockResolvedValue(null),
    listVariantsBySkus: vi.fn().mockResolvedValue([]),
    getVariantSummary: vi.fn(),
    updateVariant: vi.fn().mockResolvedValue(variantFixture),
    softDeleteVariant: vi.fn(),
    countActiveVariantsForProduct: vi.fn().mockResolvedValue(2),
    createCategory: vi.fn().mockResolvedValue(categoryFixture),
    updateCategory: vi.fn().mockResolvedValue(categoryFixture),
    unsetParentForSubcategories: vi.fn(),
    deleteCategory: vi.fn(),
    findCategoryById: vi.fn().mockResolvedValue(categoryFixture),
    findCategoryBySlug: vi.fn().mockResolvedValue(null),
    findCategoriesByIds: vi.fn().mockResolvedValue([categoryFixture]),
    listCategories: vi.fn().mockResolvedValue([categoryFixture]),
    setProductCategories: vi.fn(),
    setProductCollections: vi.fn(),
    getCategoriesForProduct: vi.fn().mockResolvedValue([categoryFixture]),
    getCollectionsForProduct: vi.fn().mockResolvedValue([collectionFixture]),
    findCollectionById: vi.fn().mockResolvedValue(collectionFixture),
    findCollectionBySlug: vi.fn().mockResolvedValue(null),
    findCollectionsBySlugs: vi.fn().mockResolvedValue([]),
    createCollection: vi.fn().mockResolvedValue(collectionFixture),
    createCollections: vi.fn().mockImplementation(async (tenantId: string, inputs: { name: string; slug: string; description?: string | null }[]) =>
      inputs.map((input: { name: string; slug: string; description?: string | null }, index: number) => ({
        id: `coll-${index + 1}`,
        tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    ),
    updateCollection: vi.fn().mockResolvedValue(collectionFixture),
    deleteCollection: vi.fn(),
    listCollections: vi.fn().mockResolvedValue({ items: [collectionFixture], page: 1, perPage: 20, total: 1 }),
    countProductsForCategory: vi.fn().mockResolvedValue(0),
    createImageRecord: vi.fn(),
    findImageById: vi.fn(),
    listImagesForProduct: vi.fn().mockResolvedValue([]),
    deleteImage: vi.fn(),
    updateImage: vi.fn(),
    insertPriceHistory: vi.fn(),
    listPriceHistoryForVariant: vi.fn(),
    findVariantsByProductIds: vi.fn().mockResolvedValue([variantFixture]),
    findVariantsWithInventoryByProductId: vi.fn().mockResolvedValue([{ ...variantFixture, availableQuantity: 0, allowBackorder: false }]),
    findVariantsWithInventoryByProductIds: vi.fn().mockResolvedValue([{ ...variantFixture, availableQuantity: 0, allowBackorder: false }]),
    findDefaultVariantsWithInventoryByProductIds: vi.fn().mockResolvedValue([{ ...variantFixture, availableQuantity: 0, allowBackorder: false }]),
    findDefaultVariantsByProductIds: vi.fn().mockResolvedValue([variantFixture]),
    listPrimaryImagesForProducts: vi.fn().mockResolvedValue([]),
    listImagesForProducts: vi.fn().mockResolvedValue([]),
    getCategoriesForProducts: vi.fn().mockResolvedValue([]),
    getCollectionsForProducts: vi.fn().mockResolvedValue([]),
  }) as unknown as CatalogRepository

describe('Layer 1: Input Validation Schemas (catalog.validators.ts)', () => {
  it('validates product creation payload successfully', () => {
    const valid = {
      title: 'Valid Product',
      slug: 'valid-product-slug',
      variants: [{ sku: 'SKU-001', title: 'Default', price: 999 }],
    }
    expect(createProductSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects product creation with invalid slug regex', () => {
    const invalidSlug = {
      title: 'Valid Title',
      slug: 'INVALID SLUG WITH SPACES',
      variants: [{ sku: 'SKU-001', title: 'Default', price: 999 }],
    }
    expect(createProductSchema.safeParse(invalidSlug).success).toBe(false)
  })

  it('rejects product variant with non-positive price', () => {
    const invalidPrice = {
      title: 'Valid Title',
      variants: [{ sku: 'SKU-001', title: 'Default', price: 0 }],
    }
    expect(createProductSchema.safeParse(invalidPrice).success).toBe(false)
  })

  it('validates bulk delete UUID array schema', () => {
    const validIds = { ids: ['123e4567-e89b-12d3-a456-426614174000'] }
    expect(bulkDeleteProductsSchema.safeParse(validIds).success).toBe(true)

    const emptyArray = { ids: [] }
    expect(bulkDeleteProductsSchema.safeParse(emptyArray).success).toBe(false)
  })
})

describe('Layer 2 & Layer 3: Service & Authorization Integration (catalog.service.ts)', () => {
  it('creates a simple product with a default variant', async () => {
    const repository = buildRepository()
    const service = new CatalogService(repository)

    const result = await service.createProduct(
      {
        title: 'Coffee Mug',
        variants: [{ sku: 'MUG-001', title: 'Default', price: 499, trackInventory: false }],
      },
      'tenant-1',
    )

    expect(result.slug).toBe('coffee-mug')
    expect(vi.mocked(repository.transaction)).toHaveBeenCalled()
  })

  it('blocks duplicate variant skus in a single payload', async () => {
    const repository = buildRepository()
    const service = new CatalogService(repository)

    await expect(
      service.createProduct(
        {
          title: 'Coffee Mug',
          variants: [
            { sku: 'MUG-001', title: 'Default', price: 499 },
            { sku: 'MUG-001', title: 'Other', price: 599 },
          ],
        },
        'tenant-1',
      ),
    ).rejects.toMatchObject({ code: 'variant-sku-conflict' })
  })

  it('blocks multiple default variants in a single payload', async () => {
    const repository = buildRepository()
    const service = new CatalogService(repository)

    await expect(
      service.createProduct(
        {
          title: 'Coffee Mug',
          variants: [
            { sku: 'MUG-001', title: 'Default 1', price: 499, isDefault: true },
            { sku: 'MUG-002', title: 'Default 2', price: 599, isDefault: true },
          ],
        },
        'tenant-1',
      ),
    ).rejects.toMatchObject({ code: 'multiple-default-variants' })
  })

  it('prevents deleting the last variant', async () => {
    const repository = buildRepository()
    vi.mocked(repository.countActiveVariantsForProduct).mockResolvedValue(1)
    const service = new CatalogService(repository)

    await expect(service.deleteVariant('var-1', 'tenant-1', adminActor)).rejects.toMatchObject({
      code: 'last-variant-protected',
    })
  })

  it('records price history when variant price changes', async () => {
    const repository = buildRepository()
    vi.mocked(repository.findVariantById).mockResolvedValue(variantFixture)
    vi.mocked(repository.findProductById).mockResolvedValue(productFixture)
    vi.mocked(repository.updateVariant).mockResolvedValue({ ...variantFixture, price: 699 })

    const service = new CatalogService(repository)
    await service.updateVariant('var-1', { price: 699 }, 'tenant-1', 'user-123', adminActor)

    expect(repository.insertPriceHistory).toHaveBeenCalledWith('tenant-1', 'var-1', 499, 699, 'user-123')
  })

  it('scopes product listings to the actor vendor at the authorization layer', async () => {
    const repository = buildRepository()
    const service = new CatalogService(repository)

    await service.listProducts('tenant-1', {}, vendorActor)

    expect(vi.mocked(repository.listProducts)).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ partnerId: 'vendor-1' }),
    )
  })

  it('blocks cross-vendor product modification', async () => {
    const repository = buildRepository()
    vi.mocked(repository.findProductById).mockResolvedValue(productFixture) // vendor-1 product

    const service = new CatalogService(repository)

    await expect(
      service.updateProduct('prod-1', { title: 'Hacked' }, 'tenant-1', foreignVendorActor),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('blocks cross-tenant access attempts', async () => {
    const repository = buildRepository()
    const service = new CatalogService(repository)

    await expect(
      service.listProducts('tenant-1', {}, foreignTenantActor),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('deletes image association via service', async () => {
    const repository = buildRepository()
    const imageFixture = {
      id: 'img-1',
      tenantId: 'tenant-1',
      productId: 'prod-1',
      variantId: null,
      url: 'http://example.com/img.png',
      storagePath: null,
      altText: null,
      position: 0,
      createdAt: new Date(),
    }
    vi.mocked(repository.findImageById).mockResolvedValue(imageFixture)

    const service = new CatalogService(repository)
    await service.deleteImage('img-1', 'tenant-1', adminActor)

    expect(repository.deleteImage).toHaveBeenCalledWith('tenant-1', 'img-1')
  })

  it('bulk soft-deletes products for admin actor', async () => {
    const repository = buildRepository()
    const service = new CatalogService(repository)

    await service.softDeleteProducts(['prod-1'], 'tenant-1', adminActor)
    expect(repository.softDeleteProducts).toHaveBeenCalledWith('tenant-1', ['prod-1'])
  })

  it('validates multi-currency variant prices schema correctly', () => {
    const payloadWithPrices = {
      title: 'Global T-Shirt',
      variants: [
        {
          sku: 'TSHIRT-GLB-1',
          title: 'Large',
          price: 2500,
          prices: [
            { currencyCode: 'usd', price: 2500, compareAtPrice: 3000 },
            { currencyCode: 'eur', price: 2300 },
            { currencyCode: 'inr', price: 199900 },
          ],
        },
      ],
    }

    const parseResult = createProductSchema.safeParse(payloadWithPrices)
    expect(parseResult.success).toBe(true)
    if (parseResult.success) {
      expect(parseResult.data.variants[0].prices).toEqual([
        { currencyCode: 'USD', price: 2500, compareAtPrice: 3000 },
        { currencyCode: 'EUR', price: 2300 },
        { currencyCode: 'INR', price: 199900 },
      ])
    }
  })
})

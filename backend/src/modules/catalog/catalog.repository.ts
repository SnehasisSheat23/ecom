import { and, count, desc, eq, exists, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { PaginatedResult } from '../../lib/types.js'

import type { Database } from '../../lib/db.js'
import { AppError } from '../../lib/errors.js'
import {
  categories,
  priceHistory,
  productCategories,
  productImages,
  products,
  variants,
  variantPrices,
  collections,
  productCollections,
} from './catalog.schema.js'
import { mediaAssets } from '../media/media.schema.js'
import { partners } from '../partner/partner.schema.js'
import { inventory } from '../inventory/inventory.schema.js'
import type {
  CatalogCategory,
  CatalogImage,
  CatalogProduct,
  CatalogProductSummary,
  CatalogVariantSummary,
  CatalogVariant,
  CatalogVariantPrice,
  VariantPriceInput,
  CreateImageRecordInput,
  CreateProductInput,
  PriceHistoryEntry,
  ProductListFilters,
  ProductOption,
  UpdateProductInput,
  UpdateVariantInput,
  CatalogCollection,
} from './catalog.types.js'

const normalizeProduct = (row: typeof products.$inferSelect): CatalogProduct => ({
  ...row,
  vendorCommissionOverride:
    row.vendorCommissionOverride === null ? null : Number(row.vendorCommissionOverride),
})
const mapProduct = (row: typeof products.$inferSelect): CatalogProduct => normalizeProduct(row)
type ProductSummaryRow = Pick<
  typeof products.$inferSelect,
  | 'id'
  | 'tenantId'
  | 'partnerId'
  | 'productTypeId'
  | 'title'
  | 'slug'
  | 'status'
  | 'productType'
  | 'catalogType'
  | 'approvalStatus'
  | 'description'
  | 'shortDescription'
  | 'vendorCommissionOverride'
  | 'specifications'
  | 'translations'
  | 'options'
  | 'tags'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
>
const mapProductSummary = (row: ProductSummaryRow): CatalogProductSummary => ({
  id: row.id,
  tenantId: row.tenantId,
  partnerId: row.partnerId,
  productTypeId: row.productTypeId,
  title: row.title,
  slug: row.slug,
  status: row.status,
  productType: row.productType,
  catalogType: row.catalogType,
  approvalStatus: row.approvalStatus,
  description: row.description,
  shortDescription: row.shortDescription,
  vendorCommissionOverride: row.vendorCommissionOverride === null ? null : Number(row.vendorCommissionOverride),
  specifications: row.specifications as Record<string, string>,
  translations: (row.translations as Record<string, Record<string, any>>) ?? {},
  options: (row.options as ProductOption[]) ?? [],
  tags: row.tags as string[],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt,
})
const mapVariant = (
  row: typeof variants.$inferSelect,
  priceRow?: { price?: number | null; compareAtPrice?: number | null } | number,
): CatalogVariant => {
  const pObj = typeof priceRow === 'object' && priceRow !== null ? priceRow : undefined
  return {
    ...row,
    price: pObj?.price ?? (row as any).price ?? 0,
    compareAtPrice: pObj?.compareAtPrice ?? (row as any).compareAtPrice ?? null,
  }
}
const mapCategory = (row: typeof categories.$inferSelect): CatalogCategory => ({
  ...row,
  keywords: row.keywords ?? undefined,
})
interface ProductImageRow {
  id: string
  tenantId: string
  productId: string
  variantId: string | null
  url: string
  storagePath: string | null
  altText: string | null
  position: number
  createdAt: Date
}
const mapImage = (row: ProductImageRow): CatalogImage => ({
  id: row.id,
  tenantId: row.tenantId,
  productId: row.productId,
  variantId: row.variantId,
  url: row.url,
  storagePath: row.storagePath,
  altText: row.altText,
  position: row.position,
  createdAt: row.createdAt,
})
const mapPriceHistory = (row: typeof priceHistory.$inferSelect): PriceHistoryEntry => row
const mapVariantPrice = (row: typeof variantPrices.$inferSelect): CatalogVariantPrice => row
const omitUndefined = <T extends Record<string, unknown>>(input: T): Partial<T> =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>

export class CatalogRepository {
  constructor(public readonly db: Database) {}

  async transaction<T>(callback: (repository: CatalogRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => callback(new CatalogRepository(tx as Database)))
  }

  async createProduct(
    tenantId: string,
    input: CreateProductInput & { slug: string },
  ): Promise<CatalogProduct> {
    const [row] = await this.db
      .insert(products)
      .values({
        tenantId,
        partnerId: input.partnerId!,
        productTypeId: input.productTypeId ?? null,
        title: input.title,
        slug: input.slug,
        description: input.description,
        shortDescription: input.shortDescription,
        status: input.status ?? 'draft',
        productType: input.productType ?? 'physical',
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        canonicalUrl: input.canonicalUrl,
        taxClass: input.taxClass,
        vendorCommissionOverride:
          input.vendorCommissionOverride === undefined || input.vendorCommissionOverride === null
            ? input.vendorCommissionOverride
            : input.vendorCommissionOverride.toFixed(2),
        approvalStatus: input.approvalStatus,
        catalogType: input.catalogType ?? 'REGULAR',
        specifications: input.specifications ?? {},
        translations: input.translations ?? {},
        options: input.options ?? [],
        tags: input.tags ?? [],
      })
      .returning()

    return mapProduct(row)
  }

  async updateProduct(
    tenantId: string,
    productId: string,
    input: UpdateProductInput & { slug?: string },
  ): Promise<CatalogProduct> {
    const [row] = await this.db
      .update(products)
      .set(omitUndefined({
        title: input.title,
        slug: input.slug,
        description: input.description,
        shortDescription: input.shortDescription,
        status: input.status,
        productType: input.productType,
        productTypeId: input.productTypeId,
        catalogType: input.catalogType,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        canonicalUrl: input.canonicalUrl,
        partnerId: input.partnerId ?? undefined,
        taxClass: input.taxClass,
        approvalStatus: input.approvalStatus,
        rejectionReason: input.rejectionReason,
        vendorCommissionOverride:
          input.vendorCommissionOverride === undefined
            ? undefined
            : input.vendorCommissionOverride === null
              ? null
              : input.vendorCommissionOverride.toFixed(2),
        options: input.options,
        tags: input.tags,
        specifications: input.specifications,
        translations: input.translations,
        updatedAt: new Date(),
      }))
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .returning()

    return mapProduct(row)
  }

  async softDeleteProduct(tenantId: string, productId: string): Promise<void> {
    await this.db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date(), status: 'archived' })
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
  }

  async softDeleteProducts(tenantId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) return
    await this.db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date(), status: 'archived' })
      .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)))
  }

  async findProductById(tenantId: string, productId: string): Promise<CatalogProduct | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.id, productId)))
      .limit(1)
    return row ? mapProduct(row) : null
  }

  async findProductsByIds(tenantId: string, productIds: string[]): Promise<CatalogProduct[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)))
    return rows.map(mapProduct)
  }

  async findProductBySlug(tenantId: string, slug: string): Promise<CatalogProduct | null> {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(slug)
    const matchCondition = isUuid
      ? or(eq(products.slug, slug), eq(products.id, slug))
      : eq(products.slug, slug)

    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), matchCondition))
      .limit(1)
    return row ? mapProduct(row) : null
  }

  async findProductsBySlugs(tenantId: string, slugs: string[]): Promise<CatalogProduct[]> {
    if (slugs.length === 0) return []
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.tenantId, tenantId), inArray(products.slug, slugs)))
    return rows.map(mapProduct)
  }

  private buildProductFilterConditions(tenantId: string, filters: ProductListFilters): any[] {
    const conditions = [eq(products.tenantId, tenantId)]

    if (!filters.includeDeleted) {
      conditions.push(isNull(products.deletedAt))
    }
    if (filters.status) {
      conditions.push(eq(products.status, filters.status))
    }
    if (filters.partnerId !== undefined) {
      conditions.push(
        filters.partnerId === null ? isNull(products.partnerId) : eq(products.partnerId, filters.partnerId),
      )
    }
    if (filters.productTypeId !== undefined) {
      conditions.push(
        filters.productTypeId === null ? isNull(products.productTypeId) : eq(products.productTypeId, filters.productTypeId),
      )
    }
    if (filters.search) {
      conditions.push(ilike(products.title, `%${filters.search}%`))
    }
    if (filters.approvalStatus) {
      conditions.push(eq(products.approvalStatus, filters.approvalStatus))
    }
    if (filters.hasVendor) {
      conditions.push(isNotNull(products.partnerId))
    }
    if (filters.isPublic) {
      conditions.push(eq(products.approvalStatus, 'APPROVED'))
      conditions.push(
        or(
          isNull(products.partnerId),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(partners)
              .where(
                and(
                  eq(partners.id, products.partnerId),
                  eq(partners.status, 'active'),
                  isNull(partners.deletedAt),
                )!,
              ),
          ),
        )!,
      )
    }

    // Filter by catalogType: default to REGULAR unless explicitly requested
    if (filters.catalogType) {
      conditions.push(eq(products.catalogType, filters.catalogType))
    } else {
      conditions.push(eq(products.catalogType, 'REGULAR'))
    }

    return conditions
  }

  private async findCategoryBySlug(tenantId: string, slug: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.slug, slug)))
      .limit(1)
    return row ?? null
  }

  async listProducts(
    tenantId: string,
    filters: ProductListFilters = {},
  ): Promise<PaginatedResult<CatalogProductSummary>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const baseConditions = this.buildProductFilterConditions(tenantId, filters)

    // Handle category filter
    if (filters.categorySlug) {
      const category = await this.findCategoryBySlug(tenantId, filters.categorySlug)
      if (!category) {
        return { items: [], page, perPage, total: 0 }
      }

      const categoryConditions = [
        eq(productCategories.categoryId, category.id),
        ...baseConditions,
      ]

      const [totalResult, rows] = await Promise.all([
        this.db
          .select({ total: count() })
          .from(productCategories)
          .innerJoin(products, eq(productCategories.productId, products.id))
          .where(and(...categoryConditions)!),
        this.db
          .select({
            id: products.id,
            tenantId: products.tenantId,
            partnerId: products.partnerId,
            productTypeId: products.productTypeId,
            title: products.title,
            slug: products.slug,
            status: products.status,
            productType: products.productType,
            catalogType: products.catalogType,
            approvalStatus: products.approvalStatus,
            description: products.description,
            shortDescription: products.shortDescription,
            vendorCommissionOverride: products.vendorCommissionOverride,
            specifications: products.specifications,
            options: products.options,
            tags: products.tags,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
            deletedAt: products.deletedAt,
          })
          .from(productCategories)
          .innerJoin(products, eq(productCategories.productId, products.id))
          .where(and(...categoryConditions)!)
          .orderBy(desc(products.createdAt))
          .limit(perPage)
          .offset((page - 1) * perPage)
      ])

      return {
        items: rows.map((row) => mapProductSummary(row)),
        page,
        perPage,
        total: totalResult[0]?.total ?? 0,
      }
    }

    // Standard list with parallel count and select
    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(products)
        .where(and(...baseConditions)!),
      this.db
        .select({
          id: products.id,
          tenantId: products.tenantId,
          partnerId: products.partnerId,
          productTypeId: products.productTypeId,
          title: products.title,
          slug: products.slug,
          status: products.status,
          productType: products.productType,
          catalogType: products.catalogType,
          approvalStatus: products.approvalStatus,
          description: products.description,
          shortDescription: products.shortDescription,
          vendorCommissionOverride: products.vendorCommissionOverride,
          specifications: products.specifications,
          options: products.options,
          tags: products.tags,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          deletedAt: products.deletedAt,
        })
        .from(products)
        .where(and(...baseConditions)!)
        .orderBy(desc(products.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage)
    ])

      return {
        items: rows.map((row) => mapProductSummary(row)),
        page,
        perPage,
        total: totalResult[0]?.total ?? 0,
      }
  }

  async createVariants(
    tenantId: string,
    productId: string,
    input: CreateProductInput['variants'],
    defaultCurrency = 'INR',
  ): Promise<CatalogVariant[]> {
    const rows = await this.db
      .insert(variants)
      .values(
        input.map((variant, index) => ({
          tenantId,
          productId,
          sku: variant.sku,
          title: variant.title,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          attributes: variant.attributes ?? {},
          trackInventory: variant.trackInventory ?? true,
          position: variant.position ?? index,
          isDefault: variant.isDefault ?? index === 0,
          weightGrams: variant.weightGrams,
          lengthMm: variant.lengthMm,
          widthMm: variant.widthMm,
          heightMm: variant.heightMm,
          costPerItem: variant.costPerItem,
          barcode: variant.barcode,
          countryOfOrigin: variant.countryOfOrigin,
          hsCode: variant.hsCode,
        })),
      )
      .returning()

    const createdVariants = rows.map(mapVariant)

    // Save corresponding price entries into variant_prices
    await Promise.all(
      createdVariants.map(async (v, index) => {
        const variantInput = input[index]
        const pricesToSave = variantInput?.prices && variantInput.prices.length > 0
          ? variantInput.prices
          : [{ currencyCode: defaultCurrency, price: v.price, compareAtPrice: v.compareAtPrice, costPerItem: v.costPerItem }]
        const savedPrices = await this.saveVariantPrices(tenantId, v.id, pricesToSave, defaultCurrency)
        v.prices = savedPrices
      }),
    )

    return createdVariants
  }

  private pickDefaultPrice(vPrices: CatalogVariantPrice[], preferredCurrency?: string): CatalogVariantPrice | undefined {
    if (!vPrices || vPrices.length === 0) return undefined
    if (preferredCurrency) {
      const match = vPrices.find((p) => p.currencyCode.toUpperCase() === preferredCurrency.toUpperCase())
      if (match) return match
    }
    return vPrices[0]
  }

  async findVariantsByProductId(
    tenantId: string,
    productId: string,
    includeDeleted = false,
    defaultCurrency = 'SAR',
  ): Promise<CatalogVariant[]> {
    const rows = await this.db
      .select({ variant: variants })
      .from(variants)
      .where(
        and(
          eq(variants.productId, productId),
          eq(variants.tenantId, tenantId),
          ...(includeDeleted ? [] : [isNull(variants.deletedAt)]),
        ),
      )
      .orderBy(variants.position)

    const variantIds = rows.map((r) => r.variant.id)
    const allPrices = variantIds.length > 0 ? await this.findPricesByVariantIds(tenantId, variantIds) : []
    const pricesByVariant = new Map<string, CatalogVariantPrice[]>()
    for (const p of allPrices) {
      const list = pricesByVariant.get(p.variantId) || []
      list.push(p)
      pricesByVariant.set(p.variantId, list)
    }

    return rows.map((r) => {
      const vPrices = pricesByVariant.get(r.variant.id) || []
      const pref = this.pickDefaultPrice(vPrices, defaultCurrency)
      return {
        ...mapVariant(r.variant, { price: pref?.price, compareAtPrice: pref?.compareAtPrice }),
        prices: vPrices,
      }
    })
  }

  async findVariantsByProductIds(
    tenantId: string,
    productIds: string[],
    includeDeleted = false,
    defaultCurrency = 'SAR',
  ): Promise<CatalogVariant[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({ variant: variants })
      .from(variants)
      .where(
        and(
          inArray(variants.productId, productIds),
          eq(variants.tenantId, tenantId),
          ...(includeDeleted ? [] : [isNull(variants.deletedAt)]),
        ),
      )
      .orderBy(variants.position)

    const variantIds = rows.map((r) => r.variant.id)
    const allPrices = variantIds.length > 0 ? await this.findPricesByVariantIds(tenantId, variantIds) : []
    const pricesByVariant = new Map<string, CatalogVariantPrice[]>()
    for (const p of allPrices) {
      const list = pricesByVariant.get(p.variantId) || []
      list.push(p)
      pricesByVariant.set(p.variantId, list)
    }

    return rows.map((r) => {
      const vPrices = pricesByVariant.get(r.variant.id) || []
      const pref = this.pickDefaultPrice(vPrices, defaultCurrency)
      return {
        ...mapVariant(r.variant, { price: pref?.price, compareAtPrice: pref?.compareAtPrice }),
        prices: vPrices,
      }
    })
  }

  async findVariantsWithInventoryByProductId(
    tenantId: string,
    productId: string,
    includeDeleted = false,
    defaultCurrency = 'SAR',
  ): Promise<(CatalogVariant & { availableQuantity: number; allowBackorder: boolean })[]> {
    const rows = await this.db
      .select({ variant: variants, inventory })
      .from(variants)
      .leftJoin(inventory, eq(inventory.variantId, variants.id))
      .where(
        and(
          eq(variants.productId, productId),
          eq(variants.tenantId, tenantId),
          ...(includeDeleted ? [] : [isNull(variants.deletedAt)]),
        ),
      )
      .orderBy(variants.position)

    const variantIds = rows.map((r) => r.variant.id)
    const allPrices = variantIds.length > 0 ? await this.findPricesByVariantIds(tenantId, variantIds) : []
    const pricesByVariant = new Map<string, CatalogVariantPrice[]>()
    for (const p of allPrices) {
      const list = pricesByVariant.get(p.variantId) || []
      list.push(p)
      pricesByVariant.set(p.variantId, list)
    }

    return rows.map((row) => {
      const vPrices = pricesByVariant.get(row.variant.id) || []
      const pref = this.pickDefaultPrice(vPrices, defaultCurrency)
      return {
        ...mapVariant(row.variant, { price: pref?.price, compareAtPrice: pref?.compareAtPrice }),
        prices: vPrices,
        availableQuantity: row.inventory?.quantityAvailable ?? 0,
        allowBackorder: row.inventory?.allowBackorder ?? false,
      }
    })
  }

  async findVariantsWithInventoryByProductIds(
    tenantId: string,
    productIds: string[],
    includeDeleted = false,
    defaultCurrency = 'SAR',
  ): Promise<(CatalogVariant & { availableQuantity: number; allowBackorder: boolean })[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({ variant: variants, inventory })
      .from(variants)
      .leftJoin(inventory, eq(inventory.variantId, variants.id))
      .where(
        and(
          inArray(variants.productId, productIds),
          eq(variants.tenantId, tenantId),
          ...(includeDeleted ? [] : [isNull(variants.deletedAt)]),
        ),
      )
      .orderBy(variants.position)

    const variantIds = rows.map((r) => r.variant.id)
    const allPrices = variantIds.length > 0 ? await this.findPricesByVariantIds(tenantId, variantIds) : []
    const pricesByVariant = new Map<string, CatalogVariantPrice[]>()
    for (const p of allPrices) {
      const list = pricesByVariant.get(p.variantId) || []
      list.push(p)
      pricesByVariant.set(p.variantId, list)
    }

    return rows.map((row) => {
      const vPrices = pricesByVariant.get(row.variant.id) || []
      const pref = this.pickDefaultPrice(vPrices, defaultCurrency)
      return {
        ...mapVariant(row.variant, { price: pref?.price, compareAtPrice: pref?.compareAtPrice }),
        prices: vPrices,
        availableQuantity: row.inventory?.quantityAvailable ?? 0,
        allowBackorder: row.inventory?.allowBackorder ?? false,
      }
    })
  }

  async findDefaultVariantsWithInventoryByProductIds(
    tenantId: string,
    productIds: string[],
    includeDeleted = false,
    defaultCurrency = 'SAR',
  ): Promise<(CatalogVariant & { availableQuantity: number; allowBackorder: boolean })[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({ variant: variants, inventory })
      .from(variants)
      .leftJoin(inventory, eq(inventory.variantId, variants.id))
      .where(
        and(
          inArray(variants.productId, productIds),
          eq(variants.tenantId, tenantId),
          or(eq(variants.isDefault, true), eq(variants.position, 0)),
          ...(includeDeleted ? [] : [isNull(variants.deletedAt)]),
        ),
      )
      .orderBy(variants.position)

    const variantIds = rows.map((r) => r.variant.id)
    const allPrices = variantIds.length > 0 ? await this.findPricesByVariantIds(tenantId, variantIds) : []
    const pricesByVariant = new Map<string, CatalogVariantPrice[]>()
    for (const p of allPrices) {
      const list = pricesByVariant.get(p.variantId) || []
      list.push(p)
      pricesByVariant.set(p.variantId, list)
    }

    return rows.map((row) => {
      const vPrices = pricesByVariant.get(row.variant.id) || []
      const pref = this.pickDefaultPrice(vPrices, defaultCurrency)
      return {
        ...mapVariant(row.variant, { price: pref?.price, compareAtPrice: pref?.compareAtPrice }),
        prices: vPrices,
        availableQuantity: row.inventory?.quantityAvailable ?? 0,
        allowBackorder: row.inventory?.allowBackorder ?? false,
      }
    })
  }


  async findPricesByVariantId(tenantId: string, variantId: string): Promise<CatalogVariantPrice[]> {
    const rows = await this.db
      .select()
      .from(variantPrices)
      .where(and(eq(variantPrices.tenantId, tenantId), eq(variantPrices.variantId, variantId)))

    return rows.map(mapVariantPrice)
  }

  async findPricesByVariantIds(tenantId: string, variantIds: string[]): Promise<CatalogVariantPrice[]> {
    if (variantIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(variantPrices)
      .where(and(eq(variantPrices.tenantId, tenantId), inArray(variantPrices.variantId, variantIds)))

    return rows.map(mapVariantPrice)
  }

  async saveVariantPrices(
    tenantId: string,
    variantId: string,
    pricesList: VariantPriceInput[],
    defaultCurrency = 'INR',
  ): Promise<CatalogVariantPrice[]> {
    if (pricesList.length === 0) {
      return []
    }

    const insertedOrUpdated = await Promise.all(
      pricesList.map(async (item) => {
        const currencyCode = (item.currencyCode || defaultCurrency).toUpperCase()
        const [row] = await this.db
          .insert(variantPrices)
          .values({
            tenantId,
            variantId,
            currencyCode,
            price: item.price,
            compareAtPrice: item.compareAtPrice ?? null,
            costPerItem: item.costPerItem ?? null,
          })
          .onConflictDoUpdate({
            target: [variantPrices.tenantId, variantPrices.variantId, variantPrices.currencyCode],
            set: {
              price: item.price,
              compareAtPrice: item.compareAtPrice ?? null,
              costPerItem: item.costPerItem ?? null,
              updatedAt: new Date(),
            },
          })
          .returning()
        return mapVariantPrice(row)
      }),
    )

    return insertedOrUpdated
  }

  async findVariantById(tenantId: string, variantId: string): Promise<CatalogVariant | null> {
    const [row] = await this.db
      .select()
      .from(variants)
      .where(and(eq(variants.tenantId, tenantId), eq(variants.id, variantId)))
      .limit(1)
    return row ? mapVariant(row) : null
  }

  async findVariantBySku(tenantId: string, sku: string): Promise<CatalogVariant | null> {
    const [row] = await this.db
      .select()
      .from(variants)
      .where(and(eq(variants.tenantId, tenantId), eq(variants.sku, sku)))
      .limit(1)
    return row ? mapVariant(row) : null
  }

  async updateVariant(
    tenantId: string,
    variantId: string,
    input: UpdateVariantInput,
    defaultCurrency = 'INR',
  ): Promise<CatalogVariant> {
    const [row] = await this.db
      .update(variants)
      .set(omitUndefined({
        sku: input.sku,
        title: input.title,
        price: input.price,
        compareAtPrice: input.compareAtPrice,
        attributes: input.attributes,
        trackInventory: input.trackInventory,
        position: input.position,
        isDefault: input.isDefault,
        weightGrams: input.weightGrams,
        lengthMm: input.lengthMm,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        costPerItem: input.costPerItem,
        barcode: input.barcode,
        countryOfOrigin: input.countryOfOrigin,
        hsCode: input.hsCode,
        updatedAt: new Date(),
      }))
      .where(and(eq(variants.tenantId, tenantId), eq(variants.id, variantId)))
      .returning()

    if (!row) {
      throw new AppError('Variant not found', 404, 'variant-not-found')
    }

    const updatedVariant = mapVariant(row)

    if (input.prices && input.prices.length > 0) {
      const savedPrices = await this.saveVariantPrices(tenantId, variantId, input.prices, defaultCurrency)
      updatedVariant.prices = savedPrices
    } else if (input.price !== undefined) {
      const savedPrices = await this.saveVariantPrices(
        tenantId,
        variantId,
        [{ currencyCode: defaultCurrency, price: input.price, compareAtPrice: input.compareAtPrice, costPerItem: input.costPerItem }],
        defaultCurrency,
      )
      updatedVariant.prices = savedPrices
    }

    return updatedVariant
  }

  async softDeleteVariant(tenantId: string, variantId: string): Promise<void> {
    const [row] = await this.db
      .update(variants)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(variants.tenantId, tenantId), eq(variants.id, variantId)))
      .returning()

    if (!row) {
      throw new AppError('Variant not found', 404, 'variant-not-found')
    }
  }

  async countActiveVariantsForProduct(tenantId: string, productId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(variants)
      .where(and(eq(variants.tenantId, tenantId), eq(variants.productId, productId), isNull(variants.deletedAt)))
    return row?.total ?? 0
  }

  async setProductCategories(tenantId: string, productId: string, categoryIds: string[]): Promise<void> {
    await this.db
      .delete(productCategories)
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.productId, productId)))
    if (categoryIds.length === 0) {
      return
    }
    await this.db.insert(productCategories).values(
      categoryIds.map((categoryId) => ({
        tenantId,
        productId,
        categoryId,
      })),
    )
  }

  async getCategoriesForProduct(tenantId: string, productId: string): Promise<CatalogCategory[]> {
    const rows = await this.db
      .select({ category: categories })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.productId, productId)))
      .orderBy(categories.sortOrder, categories.name)

    return rows.map((row) => mapCategory(row.category))
  }

  async getCategoriesForProducts(tenantId: string, productIds: string[]): Promise<{ productId: string, category: CatalogCategory }[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({ productId: productCategories.productId, category: categories })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(and(eq(productCategories.tenantId, tenantId), inArray(productCategories.productId, productIds)))
      .orderBy(categories.sortOrder, categories.name)

    return rows.map((row) => ({ productId: row.productId, category: mapCategory(row.category) }))
  }

  async countProductsForCategory(tenantId: string, categoryId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(productCategories)
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.categoryId, categoryId)))
    return row?.total ?? 0
  }

  async createImageRecord(tenantId: string, input: CreateImageRecordInput): Promise<CatalogImage> {
    const [inserted] = await this.db
      .insert(productImages)
      .values({
        tenantId,
        productId: input.productId,
        variantId: input.variantId,
        mediaId: input.mediaId,
        altText: input.altText,
        position: input.position ?? 0,
      })
      .returning()

    const [row] = await this.db
      .select({
        id: productImages.id,
        tenantId: productImages.tenantId,
        productId: productImages.productId,
        variantId: productImages.variantId,
        position: productImages.position,
        altText: productImages.altText,
        createdAt: productImages.createdAt,
        url: mediaAssets.url,
        storagePath: mediaAssets.storagePath,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(eq(productImages.id, inserted.id))
      .limit(1)

    return mapImage(row)
  }

  async findImageById(tenantId: string, imageId: string): Promise<CatalogImage | null> {
    const [row] = await this.db
      .select({
        id: productImages.id,
        tenantId: productImages.tenantId,
        productId: productImages.productId,
        variantId: productImages.variantId,
        position: productImages.position,
        altText: productImages.altText,
        createdAt: productImages.createdAt,
        url: mediaAssets.url,
        storagePath: mediaAssets.storagePath,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(and(eq(productImages.tenantId, tenantId), eq(productImages.id, imageId)))
      .limit(1)
    return row ? mapImage(row) : null
  }

  async listVariantsBySkus(tenantId: string, skus: string[]): Promise<CatalogVariant[]> {
    if (skus.length === 0) {
      return []
    }

    const rows = await this.db
      .select()
      .from(variants)
      .where(and(eq(variants.tenantId, tenantId), inArray(variants.sku, skus)))
    return rows.map(mapVariant)
  }

  async listImagesForProduct(tenantId: string, productId: string): Promise<CatalogImage[]> {
    const rows = await this.db
      .select({
        id: productImages.id,
        tenantId: productImages.tenantId,
        productId: productImages.productId,
        variantId: productImages.variantId,
        position: productImages.position,
        altText: productImages.altText,
        createdAt: productImages.createdAt,
        url: mediaAssets.url,
        storagePath: mediaAssets.storagePath,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(and(eq(productImages.tenantId, tenantId), eq(productImages.productId, productId)))
      .orderBy(productImages.position, productImages.createdAt)
    return rows.map(mapImage)
  }

  async listImagesForProducts(tenantId: string, productIds: string[]): Promise<CatalogImage[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({
        id: productImages.id,
        tenantId: productImages.tenantId,
        productId: productImages.productId,
        variantId: productImages.variantId,
        position: productImages.position,
        altText: productImages.altText,
        createdAt: productImages.createdAt,
        url: mediaAssets.url,
        storagePath: mediaAssets.storagePath,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(and(eq(productImages.tenantId, tenantId), inArray(productImages.productId, productIds)))
      .orderBy(productImages.position, productImages.createdAt)
    return rows.map(mapImage)
  }

  async deleteImage(tenantId: string, imageId: string): Promise<void> {
    await this.db.delete(productImages).where(and(eq(productImages.tenantId, tenantId), eq(productImages.id, imageId)))
  }

  async updateImage(
    tenantId: string,
    imageId: string,
    input: { variantId?: string | null; position?: number; altText?: string | null },
  ): Promise<CatalogImage> {
    await this.db
      .update(productImages)
      .set(input)
      .where(and(eq(productImages.tenantId, tenantId), eq(productImages.id, imageId)))

    const updated = await this.findImageById(tenantId, imageId)
    if (!updated) {
      throw new AppError('Image not found', 404, 'image-not-found')
    }
    return updated
  }

  async insertPriceHistory(
    tenantId: string,
    variantId: string,
    oldPrice: number,
    newPrice: number,
    changedBy?: string,
  ): Promise<PriceHistoryEntry> {
    const [row] = await this.db
      .insert(priceHistory)
      .values({
        tenantId,
        variantId,
        oldPrice,
        newPrice,
        changedBy,
      })
      .returning()

    return mapPriceHistory(row)
  }

  async listPriceHistoryForVariant(tenantId: string, variantId: string): Promise<PriceHistoryEntry[]> {
    const rows = await this.db
      .select()
      .from(priceHistory)
      .where(and(eq(priceHistory.tenantId, tenantId), eq(priceHistory.variantId, variantId)))
      .orderBy(desc(priceHistory.changedAt))
    return rows.map(mapPriceHistory)
  }

  async getVariantSummary(tenantId: string, variantId: string): Promise<CatalogVariantSummary | null> {
    const [row] = await this.db
      .select({
        variant: variants,
        product: products,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(eq(variants.tenantId, tenantId), eq(variants.id, variantId)))
      .limit(1)

    if (!row) {
      return null
    }

    const prices = await this.findPricesByVariantId(tenantId, variantId)

    return {
      variantId: row.variant.id,
      productId: row.product.id,
      tenantId: row.variant.tenantId,
      partnerId: row.product.partnerId,
      sku: row.variant.sku,
      title: row.variant.title,
      productTitle: row.product.title,
      price: prices[0]?.price ?? (row.variant as any).price ?? 0,
      productType: row.product.productType,
      catalogType: row.product.catalogType,
      trackInventory: row.variant.trackInventory,
      isDeleted: Boolean(row.variant.deletedAt || row.product.deletedAt),
      productStatus: row.product.status,
    }
  }

  async findDefaultVariantsByProductIds(
    tenantId: string,
    productIds: string[],
    includeDeleted = false,
  ): Promise<CatalogVariant[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(variants)
      .where(
        and(
          inArray(variants.productId, productIds),
          eq(variants.tenantId, tenantId),
          or(eq(variants.isDefault, true), eq(variants.position, 0)),
          ...(includeDeleted ? [] : [isNull(variants.deletedAt)]),
        ),
      )
      .orderBy(variants.position)

    return rows.map(mapVariant)
  }

  async getVariantSnapshots(tenantId: string, variantIds: string[]): Promise<CatalogVariantSummary[]> {
    if (variantIds.length === 0) return []
    const rows = await this.db
      .select({
        variant: variants,
        product: products,
      })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(eq(variants.tenantId, tenantId), inArray(variants.id, variantIds)))

    const prices = await this.findPricesByVariantIds(tenantId, variantIds)
    const pricesByVariant = new Map<string, CatalogVariantPrice[]>()
    for (const p of prices) {
      const list = pricesByVariant.get(p.variantId) || []
      list.push(p)
      pricesByVariant.set(p.variantId, list)
    }

    return rows.map((row) => {
      const vPrices = pricesByVariant.get(row.variant.id) || []
      return {
        variantId: row.variant.id,
        productId: row.product.id,
        tenantId: row.variant.tenantId,
        partnerId: row.product.partnerId,
        sku: row.variant.sku,
        title: row.variant.title,
        productTitle: row.product.title,
        price: vPrices[0]?.price ?? (row.variant as any).price ?? 0,
        productType: row.product.productType,
        catalogType: row.product.catalogType,
        trackInventory: row.variant.trackInventory,
        isDeleted: Boolean(row.variant.deletedAt || row.product.deletedAt),
        productStatus: row.product.status,
      }
    })
  }

  async listPrimaryImagesForProducts(tenantId: string, productIds: string[]): Promise<CatalogImage[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({
        id: productImages.id,
        tenantId: productImages.tenantId,
        productId: productImages.productId,
        variantId: productImages.variantId,
        position: productImages.position,
        altText: productImages.altText,
        createdAt: productImages.createdAt,
        url: mediaAssets.url,
        storagePath: mediaAssets.storagePath,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(and(eq(productImages.tenantId, tenantId), inArray(productImages.productId, productIds), eq(productImages.position, 0)))
      .orderBy(productImages.createdAt)
    return rows.map(mapImage)
  }

  async setProductCollections(tenantId: string, productId: string, collectionIds: string[]): Promise<void> {
    await this.db
      .delete(productCollections)
      .where(and(eq(productCollections.tenantId, tenantId), eq(productCollections.productId, productId)))
    if (collectionIds.length === 0) {
      return
    }
    await this.db.insert(productCollections).values(
      collectionIds.map((collectionId) => ({
        tenantId,
        productId,
        collectionId,
      })),
    )
  }

  async getCollectionsForProduct(tenantId: string, productId: string): Promise<CatalogCollection[]> {
    const rows = await this.db
      .select({ collection: collections })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(and(eq(productCollections.tenantId, tenantId), eq(productCollections.productId, productId)))
      .orderBy(collections.name)

    return rows.map((row) => row.collection)
  }

  async getCollectionsForProducts(tenantId: string, productIds: string[]): Promise<{ productId: string, collection: CatalogCollection }[]> {
    if (productIds.length === 0) return []
    const rows = await this.db
      .select({ productId: productCollections.productId, collection: collections })
      .from(productCollections)
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(and(eq(productCollections.tenantId, tenantId), inArray(productCollections.productId, productIds)))
      .orderBy(collections.name)

    return rows.map((row) => ({ productId: row.productId, collection: row.collection }))
  }

  async findCollectionsBySlugs(tenantId: string, slugs: string[]): Promise<CatalogCollection[]> {
    if (slugs.length === 0) return []
    return this.db
      .select()
      .from(collections)
      .where(and(eq(collections.tenantId, tenantId), inArray(collections.slug, slugs)))
  }

  async createCollections(tenantId: string, inputs: { name: string; slug: string; description?: string | null }[]): Promise<CatalogCollection[]> {
    if (inputs.length === 0) return []
    return this.db
      .insert(collections)
      .values(
        inputs.map((input) => ({
          tenantId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
        }))
      )
      .returning()
  }
}



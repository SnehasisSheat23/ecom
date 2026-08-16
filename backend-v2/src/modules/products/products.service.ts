import { eq, or, ilike, sql } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { products, categories, type PriceTier } from '../../database/schema.js'

export interface CreateProductInput {
  sku?: string
  title?: string
  description?: string
  slug?: string
  price?: number
  compareAtPrice?: number
  currency?: string
  pricing?: Record<string, { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }>
  moq?: number
  moqStep?: number
  seo?: Record<string, any>
  attributes?: Record<string, any>
  specifications?: Record<string, any>
  stockQuantity?: number
  status?: string
  images?: string[] | any[]
  categoryId?: string | null
  categoryIds?: string[]
  translations?: {
    en?: { title: string; description: string; slug: string }
    ar?: { title: string; description: string; slug: string }
  }
}

export class ProductsService {
  private db = getDatabase()

  private formatPricingMap(
    pricing?: Record<string, { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }>,
    defaultPrice?: number,
    defaultCompareAt?: number,
    defaultCurrency: string = 'AED'
  ) {
    const result: Record<string, { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: PriceTier[] }> = {}

    if (pricing && Object.keys(pricing).length > 0) {
      for (const [code, data] of Object.entries(pricing)) {
        if (!data) continue
        let p = typeof data === 'object' ? data.price : (data as any)
        let c = typeof data === 'object' ? data.compare_at : undefined
        let corp = typeof data === 'object' ? data.corporatePrice : undefined
        let tiers = typeof data === 'object' && Array.isArray(data.tieredPricing) ? data.tieredPricing : undefined

        p = typeof p === 'number' && !isNaN(p) ? p : Number(p || 0)
        c = (c !== undefined && c !== null && !isNaN(Number(c))) ? Number(c) : undefined
        corp = (corp !== undefined && corp !== null && !isNaN(Number(corp))) ? Number(corp) : undefined

        result[code] = {
          price: p || 0,
          ...(c !== undefined ? { compare_at: c } : {}),
          ...(corp !== undefined ? { corporatePrice: corp } : {}),
          ...(tiers && tiers.length > 0 ? { tieredPricing: tiers } : {}),
        }
      }
    } else if (defaultPrice !== undefined) {
      let p = typeof defaultPrice === 'number' ? defaultPrice : Number(defaultPrice || 0)
      let c = (defaultCompareAt !== undefined && defaultCompareAt !== null && !isNaN(Number(defaultCompareAt))) ? Number(defaultCompareAt) : undefined

      result[defaultCurrency] = {
        price: p || 0,
        ...(c !== undefined ? { compare_at: c } : {}),
      }
    }

    if (!result['AED']) {
      result['AED'] = { price: 65, compare_at: 75 }
    }

    return result
  }

  async createProduct(input: CreateProductInput) {
    const sku = input.sku || `SKU-${Date.now()}`
    const title = input.title || sku
    const description = input.description || ''
    const slug = input.slug || (input.translations?.en?.slug) || sku.toLowerCase()

    const translations = input.translations || {
      en: {
        title,
        description,
        slug,
      },
    }

    const pricing = this.formatPricingMap(
      input.pricing,
      input.price,
      input.compareAtPrice,
      input.currency || 'AED'
    )

    const rawImages = input.images || []
    const images = rawImages.map((img: any) => typeof img === 'string' ? img : (img.url || img.src || ''))
    const targetCategoryId = input.categoryId !== undefined ? input.categoryId : (input.categoryIds?.[0] || null)

    const [product] = await this.db
      .insert(products)
      .values({
        sku,
        categoryId: targetCategoryId,
        translations,
        pricing,
        moq: input.moq ?? 1,
        moqStep: input.moqStep ?? 1,
        seo: input.seo || {},
        attributes: input.attributes || {},
        specifications: input.specifications || {},
        stockQuantity: input.stockQuantity ?? 100,
        status: (input.status || 'active').toLowerCase(),
        images,
      })
      .returning()
    return this.formatProduct(product, 'en', 'AED')
  }

  async getProducts(options: {
    lang?: 'en' | 'ar'
    currency?: 'AED' | 'SAR' | 'INR' | 'GBP' | 'USD' | 'EUR' | string
    q?: string
    status?: string
    limit?: number
    page?: number
  }) {
    const lang = options.lang || 'en'
    const currency = options.currency || 'AED'
    const limit = options.limit || 50
    const page = options.page || 1
    const offset = (page - 1) * limit

    const conditions = []
    if (options.status) {
      conditions.push(eq(products.status, options.status.toLowerCase()))
    }

    if (options.q) {
      const searchPattern = `%${options.q}%`
      conditions.push(
        or(
          ilike(products.sku, searchPattern),
          sql`v2_products.translations->'en'->>'title' ILIKE ${searchPattern}`,
          sql`v2_products.translations->'ar'->>'title' ILIKE ${searchPattern}`
        )
      )
    }

    const items = await this.db
      .select()
      .from(products)
      .where(conditions.length ? sql.join(conditions, sql` AND `) : undefined)
      .limit(limit)
      .offset(offset)

    const formatted = await Promise.all(items.map((p) => this.formatProduct(p, lang, currency)))
    return { items: formatted, page, limit, total: formatted.length }
  }

  async getProductByIdOrSlug(idOrSlug: string, lang: 'en' | 'ar' = 'en', currency: string = 'AED') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
    let item: any[] = []

    if (isUuid) {
      item = await this.db.select().from(products).where(eq(products.id, idOrSlug)).limit(1)
    }

    if (!item[0]) {
      item = await this.db.select().from(products).where(eq(products.sku, idOrSlug)).limit(1)
    }
    if (!item[0]) {
      item = await this.db
        .select()
        .from(products)
        .where(sql`v2_products.translations->'en'->>'slug' = ${idOrSlug} OR v2_products.translations->'ar'->>'slug' = ${idOrSlug}`)
        .limit(1)
    }

    if (!item[0]) return null
    return this.formatProduct(item[0], lang, currency)
  }

  async updateProduct(id: string, input: Partial<CreateProductInput> & { variants?: any[] }) {
    const [existing] = await this.db.select().from(products).where(eq(products.id, id)).limit(1)
    if (!existing) return null

    const updatedTranslations = existing.translations || {}
    if (input.title || input.description || input.slug) {
      updatedTranslations.en = {
        title: input.title || updatedTranslations.en?.title || existing.sku,
        description: input.description || updatedTranslations.en?.description || '',
        slug: input.slug || updatedTranslations.en?.slug || existing.sku.toLowerCase(),
      }
    }
    if (input.translations) {
      Object.assign(updatedTranslations, input.translations)
    }

    const updatedPricing = { ...(existing.pricing || {}) }

    if (input.pricing && Object.keys(input.pricing).length > 0) {
      const formatted = this.formatPricingMap(input.pricing)
      Object.assign(updatedPricing, formatted)
    }

    if (input.variants && input.variants.length > 0 && input.variants[0].prices && input.variants[0].prices.length > 0) {
      for (const pr of input.variants[0].prices) {
        if (!pr.currencyCode) continue
        const code = pr.currencyCode.toUpperCase()
        let p = Number(pr.price) || 0
        let c = pr.compareAtPrice !== undefined && pr.compareAtPrice !== null && pr.compareAtPrice !== "" ? Number(pr.compareAtPrice) : undefined
        let corp = pr.corporatePrice !== undefined && pr.corporatePrice !== null && pr.corporatePrice !== "" ? Number(pr.corporatePrice) : undefined
        let tiers = Array.isArray(pr.tieredPricing) ? pr.tieredPricing : undefined
        updatedPricing[code] = {
          price: p,
          ...(c !== undefined ? { compare_at: c } : {}),
          ...(corp !== undefined ? { corporatePrice: corp } : {}),
          ...(tiers && tiers.length > 0 ? { tieredPricing: tiers } : {}),
        }
      }
    }

    if (input.price !== undefined) {
      const activeCurrency = (input.currency || 'SAR').toUpperCase()
      let p = typeof input.price === 'number' ? input.price : Number(input.price || 0)
      let c = (input.compareAtPrice !== undefined && input.compareAtPrice !== null && !isNaN(Number(input.compareAtPrice))) ? Number(input.compareAtPrice) : undefined
      updatedPricing[activeCurrency] = {
        ...(updatedPricing[activeCurrency] || {}),
        price: p,
        ...(c !== undefined ? { compare_at: c } : {}),
      }
    }

    let updatedImages = existing.images || []
    if (input.images) {
      updatedImages = input.images.map((img: any) => typeof img === 'string' ? img : (img.url || img.src || ''))
    }

    const [updated] = await this.db
      .update(products)
      .set({
        categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
        translations: updatedTranslations,
        pricing: updatedPricing,
        moq: input.moq !== undefined ? input.moq : existing.moq,
        moqStep: input.moqStep !== undefined ? input.moqStep : existing.moqStep,
        stockQuantity: input.stockQuantity !== undefined ? input.stockQuantity : existing.stockQuantity,
        status: input.status !== undefined ? input.status : existing.status,
        images: updatedImages,
        specifications: input.specifications !== undefined ? input.specifications : existing.specifications,
        attributes: input.attributes !== undefined ? input.attributes : existing.attributes,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning()

    return this.formatProduct(updated, 'en', 'SAR')
  }

  async deleteProduct(id: string) {
    const [deleted] = await this.db.delete(products).where(eq(products.id, id)).returning()
    return deleted
  }

  async validateMoq(productId: string, quantity: number): Promise<{ valid: boolean; reason?: string }> {
    const [prod] = await this.db.select().from(products).where(eq(products.id, productId)).limit(1)
    if (!prod) {
      return { valid: false, reason: 'Product not found' }
    }
    const moq = prod.moq || 1
    const moqStep = prod.moqStep || 1
    if (quantity < moq) {
      return { valid: false, reason: `Minimum order quantity is ${moq}.` }
    }
    if ((quantity - moq) % moqStep !== 0) {
      return { valid: false, reason: `Quantity must be ordered in increments of ${moqStep} above minimum quantity of ${moq}.` }
    }
    return { valid: true }
  }

  private async formatProduct(product: typeof products.$inferSelect, lang: 'en' | 'ar', currency: string) {
    const langData = (product.translations?.[lang] || product.translations?.['en'] || product.translations?.['ar'] || {}) as any
    const priceData = product.pricing[currency] || product.pricing['SAR'] || product.pricing['AED'] || { price: 0 }

    // Stored directly as standard decimal units
    const rawPrice = priceData.price ?? 0
    const price = Number(rawPrice) || 0
    const rawCompare = priceData.compare_at
    const compareAtPrice = (rawCompare !== undefined && rawCompare !== null) ? Number(rawCompare) : undefined

    let categoryName = '-'
    let categoryArabic = ''
    let categoryEnglish = ''
    if (product.categoryId) {
      const [cat] = await this.db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1)
      if (cat) {
        categoryEnglish = cat.translations?.en?.name || ''
        categoryArabic = cat.translations?.ar?.name || ''
        categoryName = lang === 'ar' ? (categoryArabic || categoryEnglish || '-') : (categoryEnglish || categoryArabic || '-')
      }
    }

    const variantPrices = Object.entries(product.pricing || {}).map(([cCode, pData]: [string, any]) => {
      const rawP = pData?.price ?? 0
      const pVal = Number(rawP) || 0
      const rawC = pData?.compare_at
      const cVal = (rawC !== undefined && rawC !== null) ? Number(rawC) : undefined
      const rawCorp = pData?.corporatePrice
      const corpVal = (rawCorp !== undefined && rawCorp !== null) ? Number(rawCorp) : undefined
      const tiers = Array.isArray(pData?.tieredPricing) ? pData.tieredPricing : undefined
      return {
        currencyCode: cCode,
        price: pVal,
        compareAtPrice: cVal !== undefined ? cVal : undefined,
        corporatePrice: corpVal !== undefined ? corpVal : undefined,
        tieredPricing: tiers,
      }
    })

    const decimalPricing: Record<string, { price: number; compare_at?: number; corporatePrice?: number; tieredPricing?: any[] }> = {}
    for (const vp of variantPrices) {
      decimalPricing[vp.currencyCode] = {
        price: vp.price,
        ...(vp.compareAtPrice !== undefined ? { compare_at: vp.compareAtPrice } : {}),
        ...(vp.corporatePrice !== undefined ? { corporatePrice: vp.corporatePrice } : {}),
        ...(vp.tieredPricing ? { tieredPricing: vp.tieredPricing } : {}),
      }
    }

    const variants = [
      {
        id: `var-${product.id}`,
        name: 'Default Variant',
        title: 'Default Variant',
        sku: product.sku,
        price,
        compareAtPrice,
        prices: variantPrices,
        trackInventory: false,
        availableQuantity: product.stockQuantity,
        allowBackorder: false,
        isDefault: true,
      }
    ]

    const rawTranslations = (product.translations || {}) as Record<string, any>
    const arabicTitle = rawTranslations.ar?.title || rawTranslations.ar?.name || (product.specifications as any)?.arabicName || ''
    const arabicDescription = rawTranslations.ar?.description || (product.specifications as any)?.descriptionArabic || ''

    return {
      id: product.id,
      sku: product.sku,
      categoryId: product.categoryId,
      categoryIds: product.categoryId ? [product.categoryId] : [],
      categories: product.categoryId ? [{ id: product.categoryId, name: categoryEnglish || categoryName, arabicName: categoryArabic }] : [],
      categoryName,
      categoryArabic,
      categoryEnglish,
      title: langData.title || langData.name || product.sku,
      arabicTitle,
      arabicDescription,
      description: langData.description || '',
      slug: langData.slug || product.sku.toLowerCase(),
      price,
      compareAtPrice,
      currency,
      moq: product.moq,
      moqStep: product.moqStep,
      seo: product.seo || {},
      attributes: product.attributes || {},
      specifications: product.specifications || {},
      stockQuantity: product.stockQuantity,
      status: product.status,
      images: product.images || [],
      variants,
      pricing: decimalPricing,
      translations: rawTranslations,
      rawTranslations,
      rawPricing: decimalPricing,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }
  }
}

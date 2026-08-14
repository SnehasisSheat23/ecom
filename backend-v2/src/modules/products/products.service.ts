import { eq, or, ilike, sql } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { products, categories } from '../../database/schema.js'

export interface CreateProductInput {
  sku?: string
  title?: string
  description?: string
  slug?: string
  price?: number
  compareAtPrice?: number
  currency?: string
  pricing?: Record<string, { price: number; compare_at?: number }>
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

  private normalizePricingToThousands(
    pricing?: Record<string, { price: number; compare_at?: number }>,
    defaultPrice?: number,
    defaultCompareAt?: number,
    defaultCurrency: string = 'AED'
  ) {
    const result: Record<string, { price: number; compare_at?: number }> = {}

    if (pricing && Object.keys(pricing).length > 0) {
      for (const [code, data] of Object.entries(pricing)) {
        if (!data) continue
        let p = typeof data === 'object' ? data.price : (data as any)
        let c = typeof data === 'object' ? data.compare_at : undefined

        if (typeof p === 'number' && p > 0 && p < 1000) {
          p = Math.round(p * 1000)
        }
        if (typeof c === 'number' && c > 0 && c < 1000) {
          c = Math.round(c * 1000)
        }

        result[code] = {
          price: p || 0,
          ...(c !== undefined ? { compare_at: c } : {}),
        }
      }
    } else if (defaultPrice !== undefined) {
      let p = defaultPrice > 0 && defaultPrice < 1000 ? Math.round(defaultPrice * 1000) : defaultPrice
      let c = defaultCompareAt && defaultCompareAt > 0 && defaultCompareAt < 1000 ? Math.round(defaultCompareAt * 1000) : defaultCompareAt

      result[defaultCurrency] = {
        price: p || 0,
        ...(c !== undefined ? { compare_at: c } : {}),
      }
    }

    if (!result['AED']) {
      result['AED'] = { price: 65000, compare_at: 75000 }
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

    const pricing = this.normalizePricingToThousands(
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
    let item = await this.db.select().from(products).where(eq(products.id, idOrSlug)).limit(1)
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
      const normalized = this.normalizePricingToThousands(input.pricing)
      Object.assign(updatedPricing, normalized)
    }

    if (input.variants && input.variants.length > 0 && input.variants[0].prices && input.variants[0].prices.length > 0) {
      for (const pr of input.variants[0].prices) {
        if (!pr.currencyCode) continue
        const code = pr.currencyCode.toUpperCase()
        let p = Number(pr.price) || 0
        let c = pr.compareAtPrice !== undefined && pr.compareAtPrice !== null && pr.compareAtPrice !== "" ? Number(pr.compareAtPrice) : undefined
        if (p > 0 && p < 1000) p = Math.round(p * 1000)
        if (c !== undefined && c > 0 && c < 1000) c = Math.round(c * 1000)
        updatedPricing[code] = {
          price: p,
          ...(c !== undefined ? { compare_at: c } : {}),
        }
      }
    }

    if (input.price !== undefined) {
      const activeCurrency = (input.currency || 'SAR').toUpperCase()
      let p = input.price > 0 && input.price < 1000 ? Math.round(input.price * 1000) : input.price
      let c = input.compareAtPrice && input.compareAtPrice > 0 && input.compareAtPrice < 1000 ? Math.round(input.compareAtPrice * 1000) : input.compareAtPrice
      updatedPricing[activeCurrency] = {
        price: p,
        ...(c !== undefined ? { compare_at: c } : {}),
      }
    }

    let updatedImages = existing.images || []
    if (input.images) {
      updatedImages = input.images.map((img: any) => typeof img === 'string' ? img : (img.url || img.src || ''))
    }

    let targetCategoryId = existing.categoryId
    if (input.categoryId !== undefined) {
      targetCategoryId = input.categoryId
    } else if (input.categoryIds !== undefined) {
      targetCategoryId = input.categoryIds[0] || null
    }

    const [updated] = await this.db
      .update(products)
      .set({
        ...(input.sku && { sku: input.sku }),
        categoryId: targetCategoryId,
        translations: updatedTranslations,
        pricing: updatedPricing,
        ...(input.moq !== undefined && { moq: input.moq }),
        ...(input.moqStep !== undefined && { moqStep: input.moqStep }),
        ...(input.seo && { seo: input.seo }),
        ...(input.attributes && { attributes: input.attributes }),
        ...(input.specifications && { specifications: input.specifications }),
        ...(input.stockQuantity !== undefined && { stockQuantity: input.stockQuantity }),
        ...(input.status && { status: input.status.toLowerCase() }),
        images: updatedImages,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning()

    const returnCurrency = input.currency || (Object.keys(updatedPricing)[0] || 'SAR')
    return this.formatProduct(updated, 'en', returnCurrency)
  }

  async deleteProduct(id: string) {
    const [deleted] = await this.db.delete(products).where(eq(products.id, id)).returning()
    return deleted
  }

  validateMoq(moq: number, moqStep: number, quantity: number): { valid: boolean; reason?: string } {
    if (quantity < moq) {
      return { valid: false, reason: `Quantity must be at least minimum order quantity of ${moq}.` }
    }
    const delta = quantity - moq
    if (delta % moqStep !== 0) {
      return { valid: false, reason: `Quantity must be ordered in increments of ${moqStep} above minimum quantity of ${moq}.` }
    }
    return { valid: true }
  }

  private async formatProduct(product: typeof products.$inferSelect, lang: 'en' | 'ar', currency: string) {
    const langData = (product.translations?.[lang] || product.translations?.['en'] || product.translations?.['ar'] || {}) as any
    const priceData = product.pricing[currency] || product.pricing['SAR'] || product.pricing['AED'] || { price: 0 }

    // Stored as integer thousands (x1000). Convert to standard decimal units (val / 1000) for API response
    const rawPrice = priceData.price || 0
    const price = rawPrice > 1000 ? rawPrice / 1000 : rawPrice
    const rawCompare = priceData.compare_at
    const compareAtPrice = (rawCompare && rawCompare > 1000) ? rawCompare / 1000 : rawCompare

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
      const rawP = pData?.price || 0
      const pVal = rawP > 1000 ? rawP / 1000 : rawP
      const rawC = pData?.compare_at
      const cVal = (rawC && rawC > 1000) ? rawC / 1000 : rawC
      return {
        currencyCode: cCode,
        price: pVal,
        compareAtPrice: cVal !== undefined ? cVal : undefined,
      }
    })

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
      pricing: product.pricing,
      translations: rawTranslations,
      rawTranslations,
      rawPricing: product.pricing,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }
  }
}

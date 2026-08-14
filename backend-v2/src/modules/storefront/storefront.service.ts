import { eq, ilike, isNull, or, sql, inArray } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { products, categories } from '../../database/schema.js'

export interface StorefrontProductsOptions {
  lang?: 'en' | 'ar'
  currency?: string
  q?: string
  categoryId?: string
  categorySlug?: string
  limit?: number
  page?: number
  sort?: 'newest' | 'price_asc' | 'price_desc'
}

export class StorefrontService {
  private db = getDatabase()

  /**
   * Get active storefront categories
   */
  async getCategories(options: { lang?: 'en' | 'ar'; tree?: boolean }) {
    const lang = options.lang || 'en'

    const activeCategories = await this.db
      .select()
      .from(categories)
      .where(or(eq(categories.status, 'active'), isNull(categories.status)))
      .orderBy(categories.displayOrder)

    const formatted = activeCategories.map((c) => this.formatCategory(c, lang))

    if (options.tree !== false) {
      return this.buildTree(formatted)
    }

    return formatted
  }

  /**
   * Get active category by ID or Slug
   */
  async getCategoryBySlugOrId(idOrSlug: string, lang: 'en' | 'ar' = 'en') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

    let cat
    if (isUuid) {
      ;[cat] = await this.db
        .select()
        .from(categories)
        .where(eq(categories.id, idOrSlug))
        .limit(1)
    } else {
      ;[cat] = await this.db
        .select()
        .from(categories)
        .where(
          or(
            sql`v2_categories.translations->'en'->>'slug' = ${idOrSlug}`,
            sql`v2_categories.translations->'ar'->>'slug' = ${idOrSlug}`
          )
        )
        .limit(1)
    }

    if (!cat || (cat.status && cat.status.toLowerCase() !== 'active')) {
      return null
    }

    const subcats = await this.db
      .select()
      .from(categories)
      .where(eq(categories.parentId, cat.id))
      .orderBy(categories.displayOrder)

    const activeSubcats = subcats.filter((sc) => !sc.status || sc.status.toLowerCase() === 'active')

    return {
      ...this.formatCategory(cat, lang),
      subcategories: activeSubcats.map((sc) => this.formatCategory(sc, lang)),
    }
  }

  /**
   * Get active storefront products with filters, sorting, and pagination
   */
  async getProducts(options: StorefrontProductsOptions) {
    const lang = options.lang || 'en'
    const rawCurr = (options.currency || 'AED').toUpperCase()
    const currency = rawCurr === 'ر.س' ? 'SAR' : (rawCurr === 'د.إ' ? 'AED' : rawCurr)
    const limit = Math.min(100, Math.max(1, options.limit || 20))
    const page = Math.max(1, options.page || 1)
    const offset = (page - 1) * limit

    const conditions = [
      or(eq(products.status, 'active'), isNull(products.status))
    ]

    // Category filter by Slug or ID
    if (options.categorySlug) {
      const [matchedCat] = await this.db
        .select()
        .from(categories)
        .where(
          or(
            sql`v2_categories.translations->'en'->>'slug' = ${options.categorySlug}`,
            sql`v2_categories.translations->'ar'->>'slug' = ${options.categorySlug}`
          )
        )
        .limit(1)

      if (matchedCat) {
        // Include matched category + its subcategory IDs
        const subcats = await this.db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.parentId, matchedCat.id))

        const targetCatIds = [matchedCat.id, ...subcats.map((s) => s.id)]
        conditions.push(inArray(products.categoryId, targetCatIds))
      }
    } else if (options.categoryId) {
      const subcats = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, options.categoryId))

      const targetCatIds = [options.categoryId, ...subcats.map((s) => s.id)]
      conditions.push(inArray(products.categoryId, targetCatIds))
    }

    // Search query filter
    if (options.q) {
      const searchPattern = `%${options.q.trim()}%`
      conditions.push(
        or(
          ilike(products.sku, searchPattern),
          sql`v2_products.translations->'en'->>'title' ILIKE ${searchPattern}`,
          sql`v2_products.translations->'ar'->>'title' ILIKE ${searchPattern}`
        )
      )
    }

    const whereClause = conditions.length ? sql.join(conditions, sql` AND `) : undefined

    // Determine sorting
    let orderByClause = sql`v2_products.created_at DESC`
    if (options.sort === 'price_asc') {
      orderByClause = sql`CAST(v2_products.pricing->${currency}->>'price' AS NUMERIC) ASC`
    } else if (options.sort === 'price_desc') {
      orderByClause = sql`CAST(v2_products.pricing->${currency}->>'price' AS NUMERIC) DESC`
    }

    const items = await this.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    const formatted = await Promise.all(items.map((p) => this.formatProduct(p, lang, currency)))

    return {
      items: formatted,
      page,
      limit,
    }
  }

  /**
   * Get single active product detail by ID or Slug
   */
  async getProductBySlugOrId(idOrSlug: string, lang: 'en' | 'ar' = 'en', currency: string = 'AED') {
    const rawCurr = (currency || 'AED').toUpperCase()
    const normalizedCurr = rawCurr === 'ر.س' ? 'SAR' : (rawCurr === 'د.إ' ? 'AED' : rawCurr)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

    let product
    if (isUuid) {
      ;[product] = await this.db.select().from(products).where(eq(products.id, idOrSlug)).limit(1)
    } else {
      ;[product] = await this.db
        .select()
        .from(products)
        .where(
          or(
            sql`v2_products.translations->'en'->>'slug' = ${idOrSlug}`,
            sql`v2_products.translations->'ar'->>'slug' = ${idOrSlug}`,
            eq(products.sku, idOrSlug)
          )
        )
        .limit(1)
    }

    if (!product || (product.status && product.status.toLowerCase() !== 'active')) {
      return null
    }

    return this.formatProduct(product, lang, currency)
  }

  /**
   * Catalog snapshot (Categories + Top Featured Products) for fast storefront home page caching
   */
  async getCatalogSnapshot(lang: 'en' | 'ar' = 'en', currency: string = 'AED') {
    const categoryTree = await this.getCategories({ lang, tree: true })
    const featuredProducts = await this.getProducts({ lang, currency, limit: 12, sort: 'newest' })

    return {
      categories: categoryTree,
      featuredProducts: featuredProducts.items,
      timestamp: new Date().toISOString(),
    }
  }

  private formatCategory(cat: typeof categories.$inferSelect, lang: 'en' | 'ar') {
    const translations = (cat.translations || {}) as Record<string, { name?: string; description?: string; slug?: string }>
    const langData = translations[lang] || translations['en'] || translations['ar'] || {}
    return {
      id: cat.id,
      parentId: cat.parentId,
      name: langData.name || '',
      arabicName: translations.ar?.name || '',
      englishName: translations.en?.name || '',
      description: langData.description || '',
      descriptionEn: translations.en?.description || '',
      descriptionAr: translations.ar?.description || '',
      slug: langData.slug || '',
      image: cat.image || 'https://placehold.co/300x300?text=Category',
      displayOrder: cat.displayOrder,
    }
  }

  private async formatProduct(product: typeof products.$inferSelect, lang: 'en' | 'ar', currency: string) {
    const translations = (product.translations || {}) as Record<string, { title?: string; name?: string; description?: string; slug?: string }>
    const langData = translations[lang] || translations['en'] || translations['ar'] || {}

    const pricing = (product.pricing || {}) as Record<string, { price: number; compare_at?: number }>
    const rawCurr = (currency || 'AED').toUpperCase()
    const normalizedCurr = rawCurr === 'ر.س' ? 'SAR' : (rawCurr === 'د.إ' ? 'AED' : rawCurr)
    const priceData = pricing[normalizedCurr] || pricing[currency] || pricing['SAR'] || pricing['AED'] || { price: 0 }

    let categoryName = '-'
    let categorySlug = ''
    if (product.categoryId) {
      const [cat] = await this.db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1)
      if (cat) {
        const catTrans = (cat.translations || {}) as Record<string, { name?: string; slug?: string }>
        categoryName = catTrans[lang]?.name || catTrans['en']?.name || '-'
        categorySlug = catTrans[lang]?.slug || catTrans['en']?.slug || ''
      }
    }

    const specs = (product.specifications || {}) as Record<string, any>
    const shortDesc = (lang === 'ar' ? (specs.netWeightAr || specs.netWeight) : specs.netWeight) || specs.packSize || specs.size || ''

    const rawPrice = priceData.price ?? 0
    const price = Number(rawPrice) || 0
    const rawCompare = priceData.compare_at
    const compareAtPrice = (rawCompare !== undefined && rawCompare !== null) ? Number(rawCompare) : undefined

    const arabicTitle = translations.ar?.title || translations.ar?.name || (product.specifications as any)?.arabicName || null
    const englishTitle = translations.en?.title || translations.en?.name || product.sku
    const descriptionEn = translations.en?.description || ''
    const descriptionAr = translations.ar?.description || (product.specifications as any)?.descriptionArabic || ''

    return {
      id: product.id,
      sku: product.sku,
      title: langData.title || langData.name || product.sku,
      arabicTitle,
      englishTitle,
      arabic: arabicTitle || '',
      description: langData.description || '',
      descriptionEn,
      descriptionAr,
      shortDescription: shortDesc,
      slug: langData.slug || product.sku.toLowerCase(),
      price,
      compareAtPrice,
      currency,
      moq: product.moq,
      moqStep: product.moqStep,
      categoryId: product.categoryId,
      categoryName,
      categorySlug,
      specifications: specs,
      stockQuantity: product.stockQuantity,
      images: product.images || [],
    }
  }

  private buildTree(categoryList: any[]) {
    const map = new Map<string, any>()
    const roots: any[] = []

    categoryList.forEach((c) => {
      map.set(c.id, { ...c, children: [] })
    })

    categoryList.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).children.push(map.get(c.id))
      } else {
        roots.push(map.get(c.id))
      }
    })

    return roots
  }
}

import { eq, isNull, or, sql } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { categories } from '../../database/schema.js'

export interface CreateCategoryInput {
  parentId?: string | null
  name?: string
  description?: string
  slug?: string
  status?: string
  isActive?: boolean
  translations?: {
    en?: { name: string; description?: string; slug: string }
    ar?: { name: string; description?: string; slug: string }
  }
  image?: string
  displayOrder?: number
}

export class CategoriesService {
  private db = getDatabase()

  async createCategory(input: CreateCategoryInput) {
    const slug = input.slug || input.name?.toLowerCase().replace(/\s+/g, '-') || `cat-${Date.now()}`
    const status = (input.status || (input.isActive !== undefined ? (input.isActive ? 'active' : 'draft') : 'active')).toLowerCase()
    const translations = input.translations || {
      en: {
        name: input.name || 'New Category',
        description: input.description || '',
        slug,
      },
    }

    const [cat] = await this.db
      .insert(categories)
      .values({
        parentId: input.parentId || null,
        translations,
        image: input.image,
        status,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning()
    return this.formatCategory(cat, 'en')
  }

  async getCategories(options: { lang?: 'en' | 'ar'; tree?: boolean }) {
    const lang = options.lang || 'en'
    const allCategories = await this.db.select().from(categories).orderBy(categories.displayOrder)

    const formatted = allCategories.map((c) => this.formatCategory(c, lang))

    if (options.tree) {
      return this.buildTree(formatted)
    }

    return formatted
  }

  async getCategoryByIdOrSlug(idOrSlug: string, lang: 'en' | 'ar' = 'en') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

    let cat
    if (isUuid) {
      ;[cat] = await this.db.select().from(categories).where(eq(categories.id, idOrSlug)).limit(1)
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

    if (!cat) return null

    const subcats = await this.db
      .select()
      .from(categories)
      .where(eq(categories.parentId, cat.id))
      .orderBy(categories.displayOrder)

    const formattedCat = this.formatCategory(cat, lang)
    const formattedSubcats = subcats.map((sc) => this.formatCategory(sc, lang))

    return {
      ...formattedCat,
      children: formattedSubcats,
    }
  }

  async updateCategory(id: string, input: Partial<CreateCategoryInput>) {
    const [existing] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (!existing) return null

    const updatedTranslations = existing.translations || {}
    if (input.name || input.description || input.slug) {
      updatedTranslations.en = {
        name: input.name || updatedTranslations.en?.name || 'Category',
        description: input.description ?? updatedTranslations.en?.description ?? '',
        slug: input.slug || updatedTranslations.en?.slug || id,
      }
    }
    if (input.translations) {
      Object.assign(updatedTranslations, input.translations)
    }

    const rawStatus = input.status || (input.isActive !== undefined ? (input.isActive ? 'active' : 'draft') : undefined)

    const [updated] = await this.db
      .update(categories)
      .set({
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        translations: updatedTranslations,
        ...(input.image !== undefined && { image: input.image }),
        ...(rawStatus !== undefined && { status: rawStatus.toLowerCase() }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning()

    return this.formatCategory(updated, 'en')
  }

  async deleteCategory(id: string) {
    const [deleted] = await this.db.delete(categories).where(eq(categories.id, id)).returning()
    return deleted
  }

  private formatCategory(cat: typeof categories.$inferSelect, lang: 'en' | 'ar') {
    const translations = (cat.translations || {}) as Record<string, { name?: string; description?: string; slug?: string }>
    const langData = translations[lang] || translations['en'] || translations['ar'] || {}
    const status = (cat.status || 'active').toLowerCase()
    return {
      id: cat.id,
      parentId: cat.parentId,
      name: langData.name || '',
      arabicName: translations.ar?.name || '',
      englishName: translations.en?.name || '',
      title: langData.name || '',
      description: langData.description || '',
      slug: langData.slug || '',
      image: cat.image,
      imageUrl: cat.image || 'https://placehold.co/100x100?text=Category',
      status,
      isActive: status === 'active',
      displayOrder: cat.displayOrder,
      translations: cat.translations,
      rawTranslations: cat.translations,
      createdAt: cat.createdAt,
    }
  }

  private buildTree(categoryList: ReturnType<typeof this.formatCategory>[]) {
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

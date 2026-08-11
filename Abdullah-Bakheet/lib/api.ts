import RAW_BACKEND_PRODUCTS from './products_fallback.json'
import { ALL_PRODUCTS } from './data'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
const TENANT_HEADER = { 'X-Tenant-Id': 'abdullah-bakheet' }

export interface StorefrontProduct {
  id: string
  slug: string
  title: string
  arabic: string
  category: string
  categoryArabic?: string
  categorySlug: string
  size: string
  price: number
  inStock: boolean
  onSale: boolean
  img: string
  description?: string
  descriptionEn?: string
  descriptionAr?: string
  specifications?: Record<string, any>
}

export interface StorefrontCategory {
  id: string
  name: string
  arabicName?: string
  slug: string
}

interface BackendProductItem {
  id: string
  title: string
  slug: string
  description?: string
  shortDescription?: string
  translations?: Record<string, Record<string, any>>
  specifications?: Record<string, any>
  variants?: Array<{
    id: string
    price?: number
    compareAtPrice?: number
    prices?: Array<{ price: number }>
  }>
  categories?: Array<{
    id: string
    name: string
    slug: string
    translations?: Record<string, Record<string, any>>
  }>
  images?: Array<{
    url: string
  }>
}

const CATEGORY_ARABIC_MAP: Record<string, string> = {
  'KETCHUP': 'كاتشب',
  'VINEGAR': 'خل',
  'PICKLES': 'مخللات',
  'SAUCES & DRESSING': 'صلصات وتتبيلات',
  'CANNED FRUITS & VEGETABLES': 'فواكه وخضروات معلبة',
  'OILS': 'زيوت',
  'OLIVES': 'زيتون',
  'FRENCH FRIES': 'بطاطس مقلية',
  'POWDERED SPICES': 'بهارات مطحونة',
  'DAIRY ITEMS': 'منتجات الألبان',
}

export function parseBackendItemsToStorefront(rawItems: BackendProductItem[]): StorefrontProduct[] {
  return rawItems.map((item) => {
    const firstVariant = item.variants?.[0]
    const spec = item.specifications || {}
    const catObj = item.categories?.[0]
    const categoryName = catObj?.translations?.en?.name || catObj?.name?.toUpperCase() || 'GENERAL'
    const categoryArabic = catObj?.translations?.ar?.name || CATEGORY_ARABIC_MAP[categoryName.toUpperCase()] || ''
    const price = parseFloat(String(item.variants?.[0]?.prices?.[0]?.price ? item.variants[0].prices[0].price / 100 : (item.variants?.[0]?.price ? (item.variants[0].price > 1000 ? item.variants[0].price / 100 : item.variants[0].price) : (spec.price || 0)))) || 0

    const arTitle = item.translations?.ar?.name || spec.arabicName || ''
    const arDesc = item.translations?.ar?.description || spec.arabicDescription || spec.descAr || ''
    const enTitle = item.translations?.en?.name || item.title || ''
    const enDesc = item.translations?.en?.description || item.description || ''

    return {
      id: item.id,
      slug: item.slug,
      title: enTitle,
      arabic: arTitle,
      category: categoryName,
      categoryArabic,
      categorySlug: catObj?.slug || '',
      size: item.shortDescription || spec.packSize || '',
      price,
      inStock: true,
      onSale: !!firstVariant?.compareAtPrice,
      img: item.images?.[0]?.url || spec.img || '',
      description: enDesc || arDesc,
      descriptionEn: enDesc,
      descriptionAr: arDesc,
      specifications: spec,
    }
  })
}

export function getFallbackProducts(): StorefrontProduct[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('fallback_products_json')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      // Ignore storage error
    }
  }

  if (Array.isArray(RAW_BACKEND_PRODUCTS) && RAW_BACKEND_PRODUCTS.length > 0) {
    return parseBackendItemsToStorefront(RAW_BACKEND_PRODUCTS as unknown as BackendProductItem[])
  }

  return ALL_PRODUCTS.map((p) => {
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || p.id
    const categoryUpper = p.category.toUpperCase()
    return {
      id: p.id,
      slug: slug,
      title: p.title,
      arabic: p.arabic,
      category: categoryUpper,
      categoryArabic: CATEGORY_ARABIC_MAP[categoryUpper] || p.category,
      categorySlug: categoryUpper.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      size: p.size,
      price: p.price,
      inStock: p.inStock ?? true,
      onSale: p.onSale ?? false,
      img: p.img || '/api/placeholder/160/160',
      description: `High quality ${p.title} for commercial and food service supply across Saudi Arabia.`,
      descriptionEn: `High quality ${p.title.toLowerCase()} for commercial and food service supply across Saudi Arabia.`,
      descriptionAr: `منتج عالي الجودة (${p.arabic}) مخصص للمطاعم والفنادق وقطاع التموين في المملكة.`,
      specifications: {
        brand: 'Abdullah Bakheet Trading',
        brandAr: 'شركة عبد الله بخيت للتجارة',
        netWeight: p.size,
        netWeightAr: p.size,
        origin: 'Saudi Arabia',
        originAr: 'المملكة العربية السعودية',
        shelfLife: '12 Months',
        shelfLifeAr: '12 شهراً',
        storage: 'Store in a cool dry place',
        storageAr: 'يحفظ في مكان بارد وجاف'
      }
    }
  })
}

export function getFallbackProductBySlug(slugOrId: string): StorefrontProduct | null {
  const products = getFallbackProducts()
  return products.find(p => p.id === slugOrId || p.slug === slugOrId) || null
}

export function getFallbackCategories(): StorefrontCategory[] {
  const products = getFallbackProducts()
  const categoryMap = new Map<string, StorefrontCategory>()

  products.forEach((p) => {
    if (!categoryMap.has(p.category)) {
      categoryMap.set(p.category, {
        id: p.categorySlug || p.category.toLowerCase(),
        name: p.category,
        arabicName: p.categoryArabic || p.category,
        slug: p.category,
      })
    }
  })

  return Array.from(categoryMap.values())
}

export async function fetchProducts(revalidateSeconds = 60): Promise<StorefrontProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      headers: TENANT_HEADER,
      next: { revalidate: revalidateSeconds },
    })
    if (!res.ok) {
      console.warn('Backend API returned non-200 response, using JSON fallback store.')
      return getFallbackProducts()
    }
    const json = await res.json()
    const rawItems: BackendProductItem[] = json.data?.items || json.data || []
    if (!rawItems || rawItems.length === 0) {
      return getFallbackProducts()
    }

    const fetchedProducts = parseBackendItemsToStorefront(rawItems)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fallback_products_json', JSON.stringify(fetchedProducts))
      } catch (e) {
        // Storage quota exceeded or disabled
      }
    }

    return fetchedProducts
  } catch (err) {
    console.error('Failed to fetch products from backend, using JSON fallback:', err)
    return getFallbackProducts()
  }
}

export async function fetchProductBySlug(slug: string, revalidateSeconds = 60): Promise<StorefrontProduct | null> {
  try {
    const res = await fetch(`${API_BASE}/products/${slug}`, {
      headers: TENANT_HEADER,
      next: { revalidate: revalidateSeconds },
    })
    if (!res.ok) {
      return getFallbackProductBySlug(slug)
    }
    const json = await res.json()
    const item = json.data
    if (!item) return getFallbackProductBySlug(slug)
    const singleArr = parseBackendItemsToStorefront([item])
    return singleArr[0] || getFallbackProductBySlug(slug)
  } catch (err) {
    console.error(`Failed to fetch product ${slug}:`, err)
    return getFallbackProductBySlug(slug)
  }
}

export async function fetchCategories(revalidateSeconds = 60): Promise<StorefrontCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      headers: TENANT_HEADER,
      next: { revalidate: revalidateSeconds },
    })
    if (!res.ok) return getFallbackCategories()
    const json = await res.json()
    const rawItems: any[] = json.data?.items || json.data || []
    if (!rawItems || rawItems.length === 0) return getFallbackCategories()
    return rawItems.map((c) => ({
      id: c.id,
      name: c.translations?.en?.name || c.name || '',
      arabicName: c.translations?.ar?.name || '',
      slug: c.slug || '',
    }))
  } catch (err) {
    console.error('Failed to fetch categories:', err)
    return getFallbackCategories()
  }
}



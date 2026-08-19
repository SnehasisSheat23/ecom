let rawBase = process.env.NEXT_PUBLIC_API_URL || ''
if (rawBase && !rawBase.startsWith('http://') && !rawBase.startsWith('https://')) {
  rawBase = `https://${rawBase}`
}
const RAW_API_BASE = rawBase
const API_BASE = RAW_API_BASE.endsWith('/api/v1') ? RAW_API_BASE : `${RAW_API_BASE}/api/v1`
const TENANT_HEADER = { 'X-Tenant-Id': process.env.NEXT_PUBLIC_TENANT_ID || 'abdullah-bakheet' }

export interface PriceTier {
  minQty: number
  maxQty?: number
  price: number
}

export interface StorefrontProduct {
  id: string
  variantId?: string
  slug: string
  title: string
  arabic: string
  category: string
  categoryArabic?: string
  categorySlug: string
  size: string
  price: number
  compareAtPrice?: number | null
  corporatePrice?: number | null
  tieredPricing?: PriceTier[]
  pricing?: Record<string, any>
  moq?: number
  moqStep?: number
  inStock: boolean
  onSale: boolean
  img: string
  images?: string[]
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

export interface FetchProductsOptions {
  page?: number
  limit?: number
  categorySlug?: string
  q?: string
  currency?: string
  lang?: string
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

export function ensureUuid(id: string): string {
  if (!id) return '00000000-0000-4000-8000-000000000001'
  if (/^[0-9a-fA-F-]{36}$/.test(id)) return id
  const clean = id.replace(/[^0-9a-fA-F]/g, '')
  return `00000000-0000-4000-8000-${clean.padStart(12, '0').slice(-12)}`
}

export function parseStorefrontProducts(items: any[]): StorefrontProduct[] {
  return items.map((item) => {
    const categoryName = item.categoryName || item.categories?.[0]?.name || 'GENERAL'
    const categoryArabic = item.categoryArabic || CATEGORY_ARABIC_MAP[categoryName.toUpperCase()] || categoryName

    const price = typeof item.price === 'number' ? item.price : 0
    const compareAtPrice = typeof item.compareAtPrice === 'number' ? item.compareAtPrice : null

    const imagesArray = Array.isArray(item.images)
      ? item.images
          .map((img: any) => (typeof img === 'string' ? img : (img?.url || img?.src || '')))
          .filter((url: string) => Boolean(url && url.trim() !== ''))
      : []

    const primaryImg = imagesArray[0] || item.img || 'https://placehold.co/300x300?text=No+Image'
    if (imagesArray.length === 0 && primaryImg && !primaryImg.includes('placehold.co')) {
      imagesArray.push(primaryImg)
    }

    const corporatePrice = typeof item.corporatePrice === 'number' ? item.corporatePrice : null
    const tieredPricing = Array.isArray(item.tieredPricing) ? item.tieredPricing : []
    const pricing = item.pricing || {}

    return {
      id: item.id,
      variantId: ensureUuid(item.id),
      slug: item.slug || item.id,
      title: item.title || item.sku || 'Untitled Product',
      arabic: item.arabicTitle || '',
      category: categoryName.toUpperCase(),
      categoryArabic,
      categorySlug: item.categorySlug || item.slug || '',
      size: item.shortDescription || item.size || '',
      price,
      compareAtPrice,
      corporatePrice,
      tieredPricing,
      pricing,
      moq: item.moq || 1,
      moqStep: item.moqStep || 1,
      inStock: item.stockQuantity !== undefined ? item.stockQuantity > 0 : true,
      onSale: compareAtPrice !== null && compareAtPrice > price,
      img: primaryImg,
      images: imagesArray,
      description: item.description || '',
      descriptionEn: item.description || '',
      descriptionAr: item.descriptionAr || item.description || '',
      specifications: item.specifications || {},
    }
  })
}

export async function fetchProductsApi(options?: FetchProductsOptions | number): Promise<{
  items: StorefrontProduct[]
  page: number
  limit: number
  hasMore: boolean
}> {
  try {
    const opts: FetchProductsOptions = typeof options === 'number' ? { limit: options } : (options || {})
    const page = opts.page || 1
    const limit = opts.limit || 16
    const currency = opts.currency || 'AED'
    const lang = opts.lang || 'en'

    let url = `${API_BASE}/storefront/products?page=${page}&limit=${limit}&currency=${currency}&lang=${lang}`
    if (opts.categorySlug && opts.categorySlug !== 'ALL') {
      url += `&categorySlug=${encodeURIComponent(opts.categorySlug.toLowerCase())}`
    }
    if (opts.q && opts.q.trim()) {
      url += `&q=${encodeURIComponent(opts.q.trim())}`
    }

    const res = await fetch(url, {
      headers: buildHeaders(),
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('Backend /storefront/products request failed:', res.status)
      return { items: [], page, limit, hasMore: false }
    }

    const json = await res.json()
    const rawItems = json.data?.items || (Array.isArray(json.data) ? json.data : [])
    const items = parseStorefrontProducts(rawItems)
    const hasMore = rawItems.length >= limit

    return { items, page, limit, hasMore }
  } catch (err) {
    console.error('Fetch products API error:', err)
    return { items: [], page: 1, limit: 16, hasMore: false }
  }
}

export async function fetchProductBySlugApi(slugOrId: string, currency: string = 'AED', lang: string = 'en'): Promise<StorefrontProduct | null> {
  try {
    const res = await fetch(`${API_BASE}/storefront/products/${slugOrId}?currency=${currency}&lang=${lang}`, {
      headers: buildHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('Backend /storefront/products/:slug request failed:', res.status)
      return null
    }
    const json = await res.json()
    const item = json.data
    if (!item) return null
    const [parsed] = parseStorefrontProducts([item])
    return parsed || null
  } catch (err) {
    console.error('Fetch single product API error:', err)
    return null
  }
}

export async function fetchCategoriesApi(langOrLimit?: string | number): Promise<StorefrontCategory[]> {
  const lang = typeof langOrLimit === 'string' ? langOrLimit : 'en'
  try {
    const res = await fetch(`${API_BASE}/storefront/categories?tree=true&lang=${lang}`, {
      headers: buildHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('Backend /storefront/categories request failed:', res.status)
      return []
    }
    const json = await res.json()
    const rawItems = json.data || []

    const flatten = (nodes: any[]): StorefrontCategory[] => {
      let acc: StorefrontCategory[] = []
      nodes.forEach((c) => {
        acc.push({
          id: c.id,
          name: c.name,
          arabicName: c.arabicName || c.name,
          slug: c.slug || c.id,
        })
        if (c.children && Array.isArray(c.children)) {
          acc = acc.concat(flatten(c.children))
        }
      })
      return acc
    }

    return flatten(rawItems)
  } catch (err) {
    console.error('Fetch categories API error:', err)
    return []
  }
}

// -------------------------------------------------------------
// Backend Integration Helpers (Cart, Auth, Profile, Orders)
// -------------------------------------------------------------

function buildHeaders(guestSessionId?: string, accessToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...TENANT_HEADER,
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  if (guestSessionId) {
    headers['X-Guest-Session-Id'] = guestSessionId
  }
  return headers
}

// ==========================================
// CART API INTEGRATIONS
// ==========================================
function normalizeCartItem(item: any) {
  if (!item) return item
  const rawPrice = item.price ?? item.unitPrice ?? 0
  const price = Number(rawPrice || 0)
  return {
    ...item,
    price,
  }
}

export async function fetchCartApi(accessToken?: string) {
  if (!accessToken) return null
  try {
    const res = await fetch(`${API_BASE}/cart`, {
      headers: buildHeaders(undefined, accessToken),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.data && Array.isArray(json.data.items)) {
      json.data.items = json.data.items.map(normalizeCartItem)
    }
    return json.data
  } catch (e) {
    console.error('fetchCartApi error:', e)
    return null
  }
}

export async function mergeCartApi(items: any[], accessToken: string) {
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/cart/merge`, {
    method: 'POST',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify({ items }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to merge cart')
  }
  const json = await res.json()
  if (json.data && Array.isArray(json.data.items)) {
    json.data.items = json.data.items.map(normalizeCartItem)
  }
  return json.data
}

export async function addToCartApi(itemPayload: any, accessToken?: string) {
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify(itemPayload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to add item to cart')
  }
  const json = await res.json()
  if (json.data && Array.isArray(json.data.items)) {
    json.data.items = json.data.items.map(normalizeCartItem)
  }
  return json.data
}

export async function updateCartItemApi(itemId: string, quantity: number, accessToken?: string) {
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
    method: 'PUT',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify({ quantity }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to update item quantity')
  }
  const json = await res.json()
  if (json.data && Array.isArray(json.data.items)) {
    json.data.items = json.data.items.map(normalizeCartItem)
  }
  return json.data
}

export async function removeCartItemApi(itemId: string, accessToken?: string) {
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: buildHeaders(undefined, accessToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to remove item from cart')
  }
  const json = await res.json()
  if (json.data && Array.isArray(json.data.items)) {
    json.data.items = json.data.items.map(normalizeCartItem)
  }
  return json.data
}

export async function clearCartApi(accessToken?: string) {
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/cart`, {
    method: 'DELETE',
    headers: buildHeaders(undefined, accessToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to clear cart')
  }
  const json = await res.json()
  return json.data
}

// ==========================================
// WISHLIST API INTEGRATIONS
// ==========================================
export async function fetchWishlistApi(accessToken?: string) {
  if (!accessToken) return null
  try {
    const res = await fetch(`${API_BASE}/wishlist`, {
      headers: buildHeaders(undefined, accessToken),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.data && Array.isArray(json.data.items)) {
      json.data.items = json.data.items.map((i: any) => ({
        ...i,
        price: Number(i.price || 0),
      }))
    }
    return json.data
  } catch (e) {
    console.error('fetchWishlistApi error:', e)
    return null
  }
}

export async function toggleWishlistApi(productId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/wishlist/toggle`, {
    method: 'POST',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify({ productId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to toggle wishlist')
  }
  const json = await res.json()
  return json.data
}

export async function mergeWishlistApi(productIds: string[], accessToken: string) {
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/wishlist/merge`, {
    method: 'POST',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify({ productIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to merge wishlist')
  }
  const json = await res.json()
  if (json.data && Array.isArray(json.data.items)) {
    json.data.items = json.data.items.map((i: any) => ({
      ...i,
      price: Number(i.price || 0),
    }))
  }
  return json.data
}

export async function removeWishlistItemApi(productId: string, accessToken: string) {
  const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
    method: 'DELETE',
    headers: buildHeaders(undefined, accessToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to remove from wishlist')
  }
  const json = await res.json()
  return json.data
}

export async function loginApi(payload: { email: string; password?: string; phone?: string; guestSessionId?: string }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: buildHeaders(payload.guestSessionId),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const details = err.details ? err.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join('; ') : ''
    throw new Error(details ? `${err.error}: ${details}` : (err.error || err.message || 'Login failed'))
  }
  const json = await res.json()
  return json.data
}

export async function registerApi(payload: { email: string; password?: string; firstName?: string; lastName?: string; phone?: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const details = err.details ? err.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join('; ') : ''
    throw new Error(details ? `${err.error}: ${details}` : (err.error || err.message || 'Registration failed'))
  }
  const json = await res.json()
  return json.data
}

export async function fetchMeApi(accessToken: string) {
  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: buildHeaders(undefined, accessToken),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch (e) {
    console.error('fetchMeApi error:', e)
    return null
  }
}

export async function placeOrderApi(orderPayload: any, guestSessionId?: string, accessToken?: string) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: buildHeaders(guestSessionId, accessToken),
    body: JSON.stringify(orderPayload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const details = err.details ? err.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join('; ') : ''
    throw new Error(details ? `${err.error || 'Failed to place order'}: ${details}` : (err.error || err.message || 'Failed to place order'))
  }
  const json = await res.json()
  return json.data
}

export async function fetchShippingMethodsApi(currency?: string) {
  try {
    const url = currency ? `${API_BASE}/shipping/methods?currency=${encodeURIComponent(currency)}` : `${API_BASE}/shipping/methods`
    const res = await fetch(url, { headers: buildHeaders() })
    if (!res.ok) return []
    const json = await res.json()
    return json.data?.items || []
  } catch (e) {
    console.error('fetchShippingMethodsApi error:', e)
    return []
  }
}

export async function calculateShippingApi(methodId?: string, currency?: string, subtotal?: number) {
  try {
    const params = new URLSearchParams()
    if (methodId) params.append('methodId', methodId)
    if (currency) params.append('currency', currency)
    if (subtotal !== undefined) params.append('subtotal', String(subtotal))
    const res = await fetch(`${API_BASE}/shipping/calculate?${params.toString()}`, { headers: buildHeaders() })
    if (!res.ok) return null
    const json = await res.json()
    return json.data || null
  } catch (e) {
    console.error('calculateShippingApi error:', e)
    return null
  }
}

// ==========================================
// B2B QUOTATIONS / RFQ API INTEGRATIONS
// ==========================================
export interface CreateQuotationItemPayload {
  productId: string
  quantity: number
  unitPrice?: number
  name?: string
  image?: string
}

export interface CreateQuotationRequestPayload {
  customerId?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  taxNumber?: string
  currency?: string
  customerNotes?: string
  items: CreateQuotationItemPayload[]
}

export interface AcceptQuotationPayload {
  customerId?: string
  paymentMethodType: 'CARD' | 'MADA' | 'APPLE_PAY' | 'BANK_TRANSFER' | 'PURCHASE_ORDER' | 'CREDIT_TERMS'
  paymentReceiptUrl?: string
  poDocumentUrl?: string
  poNumber?: string
  shippingAddressSnapshot?: Record<string, any>
  billingAddressSnapshot?: Record<string, any>
}

export async function createQuotationRequestApi(payload: CreateQuotationRequestPayload, accessToken?: string) {
  const res = await fetch(`${API_BASE}/quotations/request`, {
    method: 'POST',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to submit quotation request')
  }
  const json = await res.json()
  return json.data
}

export async function fetchQuotationByIdApi(id: string, accessToken?: string) {
  const res = await fetch(`${API_BASE}/quotations/${encodeURIComponent(id)}`, {
    headers: buildHeaders(undefined, accessToken),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to fetch quotation details')
  }
  const json = await res.json()
  return json.data
}

export async function acceptQuotationApi(id: string, payload: AcceptQuotationPayload, accessToken?: string) {
  const res = await fetch(`${API_BASE}/quotations/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    headers: buildHeaders(undefined, accessToken),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || err.message || 'Failed to accept quotation')
  }
  const json = await res.json()
  return json.data
}

export async function fetchCustomerQuotationsApi(params?: { customerId?: string; email?: string; status?: string }, accessToken?: string) {
  const query = new URLSearchParams()
  if (params?.customerId) query.append('customerId', params.customerId)
  if (params?.email) query.append('email', params.email)
  if (params?.status) query.append('status', params.status)
  
  const res = await fetch(`${API_BASE}/quotations?${query.toString()}`, {
    headers: buildHeaders(undefined, accessToken),
  })
  if (!res.ok) return []
  const json = await res.json()
  return json.data || []
}

// Storefront Helper Wrappers
export async function fetchProducts(options?: FetchProductsOptions | number): Promise<StorefrontProduct[]> {
  const res = await fetchProductsApi(options)
  return res.items
}

export const fetchProductBySlug = fetchProductBySlugApi;
export const fetchCategories = fetchCategoriesApi;


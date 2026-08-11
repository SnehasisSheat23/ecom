import type { CatalogRepository } from './catalog.repository.js'

export interface SearchProduct {
  id: string
  t: string // title
  s: string // slug
  sk: string // sku
  p: number // price
  img: string | null // image url
}

export class CatalogSearchService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly kv: any // KVNamespace
  ) {}

  async syncTenantIndex(tenantId: string): Promise<void> {
    // Fetch active, public products for the tenant
    // We fetch a larger batch since this is a background process
    const result = await this.repository.listProducts(tenantId, {
      status: 'active',
      isPublic: true,
      perPage: 1000,
      summary: true
    })

    if (result.items.length === 0) {
      await this.kv.put(`search:${tenantId}:index`, JSON.stringify([]))
      return
    }

    const productIds = result.items.map((p) => p.id)

    // Fetch variants and images in bulk to populate the index
    const [variants, images] = await Promise.all([
      this.repository.findDefaultVariantsByProductIds(tenantId, productIds),
      this.repository.listPrimaryImagesForProducts(tenantId, productIds)
    ])

    const variantsByProduct = new Map(variants.map(v => [v.productId, v]))
    const imagesByProduct = new Map(images.map(i => [i.productId, i]))

    const searchData: SearchProduct[] = result.items.map((product) => {
      const variant = variantsByProduct.get(product.id)
      const image = imagesByProduct.get(product.id)

      return {
        id: product.id,
        t: product.title,
        s: product.slug,
        sk: variant?.sku || '',
        p: variant?.price || 0,
        img: image?.url || null,
      }
    })

    // Store the JSON index in KV
    await this.kv.put(`search:${tenantId}:index`, JSON.stringify(searchData))
  }
}

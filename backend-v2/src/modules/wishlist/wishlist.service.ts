import { eq, and, inArray } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { wishlistItems, products } from '../../database/schema.js'

export class WishlistService {
  private getDb() {
    return getDatabase()
  }

  async getWishlist(customerId: string) {
    const db = this.getDb()

    const rawList = await db
      .select({
        id: wishlistItems.id,
        customerId: wishlistItems.customerId,
        productId: wishlistItems.productId,
        createdAt: wishlistItems.createdAt,
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.customerId, customerId))

    if (rawList.length === 0) {
      return { items: [], total: 0 }
    }

    const productIds = rawList.map((w) => w.productId)
    const productRecords = await db.select().from(products).where(inArray(products.id, productIds))
    const productMap = new Map(productRecords.map((p) => [p.id, p]))

    const items = rawList
      .map((w) => {
        const prod = productMap.get(w.productId)
        if (!prod) return null

        const title = prod.translations?.en?.title || 'Product'
        const image = (prod.images && prod.images.length > 0) ? prod.images[0] : ''
        const rawPrice = prod.pricing?.AED?.price ?? 0
        const price = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice / 100 : Number(rawPrice || 0)

        return {
          id: prod.id,
          wishlistEntryId: w.id,
          name: title,
          category: prod.categoryId || '',
          price,
          image,
          status: prod.status,
          moq: prod.moq || 1,
          createdAt: w.createdAt,
        }
      })
      .filter(Boolean)

    return {
      items,
      total: items.length,
    }
  }

  async toggleWishlist(customerId: string, productId: string) {
    const db = this.getDb()

    const existing = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))
      .limit(1)

    if (existing.length > 0) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing[0].id))
      return {
        isInWishlist: false,
        productId,
        message: 'Removed from wishlist',
      }
    }

    await db.insert(wishlistItems).values({
      customerId,
      productId,
    })

    return {
      isInWishlist: true,
      productId,
      message: 'Added to wishlist',
    }
  }

  async mergeWishlist(customerId: string, productIds: string[]) {
    const db = this.getDb()
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return this.getWishlist(customerId)
    }

    // Filter valid product IDs
    const validProds = await db.select({ id: products.id }).from(products).where(inArray(products.id, productIds))
    const validIds = validProds.map((p) => p.id)

    for (const prodId of validIds) {
      const existing = await db
        .select()
        .from(wishlistItems)
        .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, prodId)))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(wishlistItems).values({
          customerId,
          productId: prodId,
        })
      }
    }

    return this.getWishlist(customerId)
  }

  async removeFromWishlist(customerId: string, productId: string) {
    const db = this.getDb()
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.customerId, customerId), eq(wishlistItems.productId, productId)))

    return this.getWishlist(customerId)
  }
}

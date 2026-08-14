import { eq, and, inArray } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { carts, cartItems, products } from '../../database/schema.js'

export interface GuestCartItemPayload {
  id?: string
  productId: string
  variantId?: string
  quantity: number
  sku?: string
  name?: string
  image?: string
  category?: string
  price?: number
  moq?: number
  moqStep?: number
  specifications?: Record<string, any>
}

export class CartService {
  private getDb() {
    return getDatabase()
  }

  async getOrCreateCart(customerId: string) {
    const db = this.getDb()
    const existing = await db.select().from(carts).where(eq(carts.customerId, customerId)).limit(1)
    if (existing.length > 0) {
      return existing[0]
    }

    const inserted = await db
      .insert(carts)
      .values({
        customerId,
        status: 'active',
      })
      .returning()

    return inserted[0]
  }

  async getCart(customerId: string) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)

    const rawItems = await db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        sku: cartItems.sku,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        itemMetadata: cartItems.itemMetadata,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id))

    if (rawItems.length === 0) {
      return {
        id: cart.id,
        customerId: cart.customerId,
        status: cart.status,
        items: [],
        totalItems: 0,
        subtotal: 0,
      }
    }

    // Fetch live product details to ensure fresh prices, titles, and active statuses
    const productIds = rawItems.map((i) => i.productId)
    const productRecords = await db.select().from(products).where(inArray(products.id, productIds))
    const productMap = new Map(productRecords.map((p) => [p.id, p]))

    let subtotal = 0
    let totalItems = 0

    const formattedItems = rawItems.map((item) => {
      const prod = productMap.get(item.productId)
      const rawLivePrice = prod?.pricing?.AED?.price ?? (item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0)
      const livePrice = typeof rawLivePrice === 'number' && rawLivePrice > 1000 ? rawLivePrice / 1000 : Number(rawLivePrice || 0)
      const title = prod?.translations?.en?.title || (item.itemMetadata as any)?.name || 'Product'
      const image = (prod?.images && prod.images.length > 0) ? prod.images[0] : ((item.itemMetadata as any)?.image || '')
      const moq = prod?.moq || (item.itemMetadata as any)?.moq || 1
      const moqStep = prod?.moqStep || (item.itemMetadata as any)?.moqStep || 1

      const lineTotal = livePrice * item.quantity
      subtotal += lineTotal
      totalItems += item.quantity

      return {
        id: item.productId, // Client uses product ID / variant ID
        itemId: item.id,
        productId: item.productId,
        sku: prod?.sku || item.sku || '',
        name: title,
        category: (item.itemMetadata as any)?.category || '',
        price: livePrice,
        quantity: item.quantity,
        image,
        moq,
        moqStep,
        lineTotal,
        status: prod?.status || 'active',
        specifications: (item.itemMetadata as any)?.specifications || prod?.specifications || {},
      }
    })

    return {
      id: cart.id,
      customerId: cart.customerId,
      status: cart.status,
      items: formattedItems,
      totalItems,
      subtotal,
    }
  }

  async mergeCart(customerId: string, guestItems: GuestCartItemPayload[]) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)

    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      return this.getCart(customerId)
    }

    // Fetch existing cart items from DB
    const existingItems = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id))

    // Collect all referenced product IDs
    const guestProductIds = guestItems.map((g) => g.productId || g.id || '').filter(Boolean)
    const productRecords = guestProductIds.length > 0
      ? await db.select().from(products).where(inArray(products.id, guestProductIds))
      : []
    const productMap = new Map(productRecords.map((p) => [p.id, p]))

    for (const gItem of guestItems) {
      const targetProductId = gItem.productId || gItem.id
      if (!targetProductId) continue

      const prod = productMap.get(targetProductId)
      // If product does not exist or is inactive, skip it
      if (!prod || prod.status === 'inactive') continue

      const minMoq = Math.max(1, prod.moq || gItem.moq || 1)
      const step = Math.max(1, prod.moqStep || gItem.moqStep || 1)
      const initialAddQty = Math.max(minMoq, gItem.quantity || minMoq)

      const rawLivePrice = prod.pricing?.AED?.price ?? gItem.price ?? 0
      const livePrice = typeof rawLivePrice === 'number' && rawLivePrice > 1000 ? rawLivePrice / 1000 : Number(rawLivePrice || 0)
      const existingMatch = existingItems.find(
        (e) => e.productId === targetProductId || (e.itemMetadata as any)?.variantId === gItem.variantId
      )

      if (existingMatch) {
        // DUPLICATE RESOLUTION: Combine quantities and respect MOQ step
        const combinedQty = existingMatch.quantity + initialAddQty
        const normalizedQty = Math.max(minMoq, combinedQty)

        await db
          .update(cartItems)
          .set({
            quantity: normalizedQty,
            unitPrice: livePrice.toString(),
            itemMetadata: {
              name: prod.translations?.en?.title || gItem.name,
              image: (prod.images && prod.images.length > 0) ? prod.images[0] : gItem.image,
              category: gItem.category,
              moq: minMoq,
              moqStep: step,
              variantId: gItem.variantId,
              specifications: gItem.specifications,
            },
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existingMatch.id))
      } else {
        // Insert new item
        await db.insert(cartItems).values({
          cartId: cart.id,
          productId: targetProductId,
          sku: prod.sku || gItem.sku,
          quantity: initialAddQty,
          unitPrice: livePrice.toString(),
          itemMetadata: {
            name: prod.translations?.en?.title || gItem.name,
            image: (prod.images && prod.images.length > 0) ? prod.images[0] : gItem.image,
            category: gItem.category,
            moq: minMoq,
            moqStep: step,
            variantId: gItem.variantId,
            specifications: gItem.specifications,
          },
        })
      }
    }

    return this.getCart(customerId)
  }

  async addItem(customerId: string, itemPayload: GuestCartItemPayload) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)
    const targetProductId = itemPayload.productId || itemPayload.id
    if (!targetProductId) throw new Error('Product ID is required')

    // Find live product
    const prodList = await db.select().from(products).where(eq(products.id, targetProductId)).limit(1)
    const prod = prodList[0]

    const minMoq = Math.max(1, prod?.moq || itemPayload.moq || 1)
    const step = Math.max(1, prod?.moqStep || itemPayload.moqStep || 1)
    const addQty = Math.max(minMoq, itemPayload.quantity || minMoq)
    const rawLivePrice = prod?.pricing?.AED?.price ?? itemPayload.price ?? 0
    const livePrice = typeof rawLivePrice === 'number' && rawLivePrice > 1000 ? rawLivePrice / 1000 : Number(rawLivePrice || 0)

    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, targetProductId)))
      .limit(1)

    if (existing.length > 0) {
      const updatedQty = existing[0].quantity + addQty
      await db
        .update(cartItems)
        .set({
          quantity: updatedQty,
          unitPrice: livePrice.toString(),
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, existing[0].id))
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: targetProductId,
        sku: prod?.sku || itemPayload.sku,
        quantity: addQty,
        unitPrice: livePrice.toString(),
        itemMetadata: {
          name: prod?.translations?.en?.title || itemPayload.name,
          image: (prod?.images && prod.images.length > 0) ? prod.images[0] : itemPayload.image,
          category: itemPayload.category,
          moq: minMoq,
          moqStep: step,
          variantId: itemPayload.variantId,
          specifications: itemPayload.specifications,
        },
      })
    }

    return this.getCart(customerId)
  }

  async updateQuantity(customerId: string, itemIdOrProductId: string, quantity: number) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)

    // Match by item ID or product ID
    const match = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.id, itemIdOrProductId)
        )
      )
      .limit(1)

    const target = match.length > 0 ? match[0] : (
      await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cart.id),
            eq(cartItems.productId, itemIdOrProductId)
          )
        )
        .limit(1)
    )[0]

    if (!target) {
      return this.getCart(customerId)
    }

    if (quantity <= 0) {
      await db.delete(cartItems).where(eq(cartItems.id, target.id))
    } else {
      await db
        .update(cartItems)
        .set({
          quantity,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, target.id))
    }

    return this.getCart(customerId)
  }

  async removeItem(customerId: string, itemIdOrProductId: string) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)

    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.productId, itemIdOrProductId)
        )
      )

    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cart.id),
          eq(cartItems.id, itemIdOrProductId)
        )
      )

    return this.getCart(customerId)
  }

  async clearCart(customerId: string) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id))
    return this.getCart(customerId)
  }
}

import { eq, and, inArray } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { carts, cartItems, products, customers } from '../../database/schema.js'

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

  async getCart(customerId: string, options?: { currency?: string }) {
    const db = this.getDb()
    const cart = await this.getOrCreateCart(customerId)
    const currency = (options?.currency || 'AED').toUpperCase()

    // Fetch customer profile to check for corporate / wholesale group and VIP discounts
    const custRecords = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
    const customerProfile = custRecords[0] || null

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
        currency,
        items: [],
        totalItems: 0,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      }
    }

    // Deduplicate and consolidate duplicate items by productId
    const consolidatedMap = new Map<string, typeof rawItems[0]>()
    const duplicateIdsToDelete: string[] = []

    for (const rItem of rawItems) {
      if (!consolidatedMap.has(rItem.productId)) {
        consolidatedMap.set(rItem.productId, { ...rItem })
      } else {
        const existing = consolidatedMap.get(rItem.productId)!
        existing.quantity += rItem.quantity
        duplicateIdsToDelete.push(rItem.id)
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      // Clean up duplicate rows from DB in background
      db.delete(cartItems).where(inArray(cartItems.id, duplicateIdsToDelete)).catch(() => {})
      for (const [prodId, cItem] of consolidatedMap.entries()) {
        db.update(cartItems).set({ quantity: cItem.quantity, updatedAt: new Date() }).where(eq(cartItems.id, cItem.id)).catch(() => {})
      }
    }

    const uniqueRawItems = Array.from(consolidatedMap.values())

    // Fetch live product details to ensure fresh prices, titles, stock, and active statuses
    const productIds = uniqueRawItems.map((i) => i.productId)
    const productRecords = await db.select().from(products).where(inArray(products.id, productIds))
    const productMap = new Map(productRecords.map((p) => [p.id, p]))

    let subtotal = 0
    let totalItems = 0
    let regularSubtotal = 0

    const formattedItems = uniqueRawItems.map((item) => {
      const prod = productMap.get(item.productId)
      const rawPricing = (prod?.pricing || {}) as any
      const currPricing = rawPricing && rawPricing[currency] ? rawPricing[currency] : (rawPricing?.AED || rawPricing?.SAR)

      const catalogBasePrice = Number(currPricing?.price ?? (item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0))
      let candidatePrice = catalogBasePrice

      // A. If Corporate / Wholesale VIP customer and product has explicit corporatePrice
      if (
        customerProfile &&
        (customerProfile.customerGroup === 'corporate' || customerProfile.customerGroup === 'wholesale') &&
        currPricing?.corporatePrice
      ) {
        candidatePrice = Number(currPricing.corporatePrice)
      }

      // B. Check Tiered Bulk Pricing breaks (gives lowest applicable rate)
      if (currPricing && Array.isArray(currPricing.tieredPricing) && currPricing.tieredPricing.length > 0) {
        const matchingTier = currPricing.tieredPricing.find((t: any) => {
          const min = Number(t.minQty || 1)
          const max = t.maxQty ? Number(t.maxQty) : Infinity
          return item.quantity >= min && item.quantity <= max
        })
        if (matchingTier && matchingTier.price) {
          candidatePrice = Math.min(candidatePrice, Number(matchingTier.price))
        }
      }

      let resolvedUnitPrice = candidatePrice

      // C. Apply Account-wide VIP discount percentage if configured
      if (customerProfile && Number(customerProfile.accountDiscountPercent) > 0) {
        const discountFrac = Number(customerProfile.accountDiscountPercent) / 100
        resolvedUnitPrice = Number((resolvedUnitPrice * (1 - discountFrac)).toFixed(2))
      }

      const livePrice = Number(resolvedUnitPrice || 0)
      const title = prod?.translations?.en?.title || (item.itemMetadata as any)?.name || 'Product'
      const image = (prod?.images && prod.images.length > 0) ? prod.images[0] : ((item.itemMetadata as any)?.image || '')
      const moq = prod?.moq || (item.itemMetadata as any)?.moq || 1
      const moqStep = prod?.moqStep || (item.itemMetadata as any)?.moqStep || 1
      const stockQty = prod?.stockQuantity ?? 0
      const isAvailable = (prod?.status === 'active') && (stockQty >= item.quantity || stockQty === 0)
      const moqValid = item.quantity >= moq

      const lineTotal = Number((livePrice * item.quantity).toFixed(2))
      const regularLineTotal = Number((catalogBasePrice * item.quantity).toFixed(2))

      subtotal += lineTotal
      regularSubtotal += regularLineTotal
      totalItems += item.quantity

      return {
        id: item.productId,
        itemId: item.id,
        productId: item.productId,
        sku: prod?.sku || item.sku || '',
        name: title,
        category: (item.itemMetadata as any)?.category || '',
        price: livePrice,
        catalogPrice: catalogBasePrice,
        quantity: item.quantity,
        image,
        moq,
        moqStep,
        corporatePrice: currPricing?.corporatePrice ? Number(currPricing.corporatePrice) : null,
        tieredPricing: Array.isArray(currPricing?.tieredPricing) ? currPricing.tieredPricing : [],
        moqValid,
        stockQuantity: stockQty,
        isAvailable,
        lineTotal,
        savings: Math.max(0, regularLineTotal - lineTotal),
        status: prod?.status || 'active',
        specifications: (item.itemMetadata as any)?.specifications || prod?.specifications || {},
      }
    })

    subtotal = Number(subtotal.toFixed(2))
    const totalSavings = Number(Math.max(0, regularSubtotal - subtotal).toFixed(2))
    const vatRate = currency === 'SAR' ? 0.15 : (currency === 'AED' ? 0.05 : 0)
    const taxAmount = Number((subtotal * vatRate).toFixed(2))
    const totalAmount = Number((subtotal + taxAmount).toFixed(2))

    return {
      id: cart.id,
      customerId: cart.customerId,
      status: cart.status,
      currency,
      items: formattedItems,
      totalItems,
      subtotal,
      savings: totalSavings,
      taxAmount,
      totalAmount,
      customerGroup: customerProfile?.customerGroup || 'retail',
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
      const livePrice = Number(rawLivePrice || 0)
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
    const livePrice = Number(rawLivePrice || 0)

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

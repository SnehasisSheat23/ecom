import { eq, or, sql, desc, asc } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { orders, orderItems, products, customers } from '../../database/schema.js'
import { ProductsService } from '../products/products.service.js'
import { shippingService } from '../shipping/shipping.service.js'

export interface CreateOrderItemInput {
  productId: string
  quantity: number
  unitPrice?: number
  price?: number
  name?: string
  image?: string
}

export interface CreateOrderInput {
  customerId?: string
  currency?: 'AED' | 'SAR' | 'INR' | 'GBP' | 'USD' | 'EUR' | string
  shippingMethodId?: string
  shippingAddressSnapshot?: Record<string, any>
  billingAddressSnapshot?: Record<string, any>
  paymentMethod?: string
  paymentMethodType?: 'CARD' | 'MADA' | 'APPLE_PAY' | 'BANK_TRANSFER' | 'PURCHASE_ORDER' | 'CREDIT_TERMS'
  paymentReceiptUrl?: string
  poDocumentUrl?: string
  poNumber?: string
  quotationId?: string
  notes?: string
  shippingCost?: number
  items: CreateOrderItemInput[]
}

export class OrdersService {
  private db = getDatabase()
  private productsService = new ProductsService()

  async createOrder(input: CreateOrderInput) {
    const currency = (input.currency || 'AED').toUpperCase()

    if (!input.items || input.items.length === 0) {
      throw new Error('Order must contain at least one product item.')
    }

    // 1. Fetch Customer Profile if logged in for B2B checks & discounts
    let customerProfile: any = null
    if (input.customerId) {
      const [cust] = await this.db.select().from(customers).where(eq(customers.id, input.customerId)).limit(1)
      customerProfile = cust || null
    }

    let subtotal = 0
    const processedItems: {
      productId: string
      sku: string
      productNameSnapshot: { en?: string; ar?: string; title?: string; image?: string; imageUrl?: string }
      unitPrice: number
      quantity: number
      totalPrice: number
    }[] = []

    for (const item of input.items) {
      // Find product by ID or SKU
      let product = await this.db.select().from(products).where(eq(products.id, item.productId)).limit(1)
      if (!product[0]) {
        product = await this.db.select().from(products).where(eq(products.sku, item.productId)).limit(1)
      }

      if (!product[0]) {
        const fallbackProds = await this.db.select().from(products).limit(1)
        if (fallbackProds[0]) {
          product = fallbackProds
        }
      }

      const p = product[0]
      const rawPricing = (p?.pricing || {}) as any
      let unitPrice: number | null = null
      const currPricing = rawPricing && rawPricing[currency] ? rawPricing[currency] : null

      // Check Corporate Pricing or Tiered Bulk Pricing
      if (currPricing && typeof currPricing === 'object') {
        const qty = item.quantity || 1

        // A. If Corporate VIP customer and product has explicit corporatePrice
        if (customerProfile && (customerProfile.customerGroup === 'corporate' || customerProfile.customerGroup === 'wholesale') && currPricing.corporatePrice) {
          unitPrice = Number(currPricing.corporatePrice)
        }
        // B. Check Tiered Bulk Pricing breaks
        else if (Array.isArray(currPricing.tieredPricing) && currPricing.tieredPricing.length > 0) {
          const matchingTier = currPricing.tieredPricing.find((t: any) => {
            const min = Number(t.minQty || 1)
            const max = t.maxQty ? Number(t.maxQty) : Infinity
            return qty >= min && qty <= max
          })
          if (matchingTier && matchingTier.price) {
            unitPrice = Number(matchingTier.price)
          }
        }

        // C. Standard catalog price
        if (unitPrice === null && currPricing.price !== undefined && currPricing.price !== null) {
          unitPrice = Number(currPricing.price)
        }
      }

      // If customer has account-wide discount percent (e.g. 15%) and no special unitPrice was chosen
      if (unitPrice !== null && customerProfile && Number(customerProfile.accountDiscountPercent) > 0) {
        const discountFrac = Number(customerProfile.accountDiscountPercent) / 100
        unitPrice = Number((unitPrice * (1 - discountFrac)).toFixed(2))
      }

      // If still no unitPrice resolved, check item-provided price or fallback
      if (unitPrice === null || isNaN(unitPrice) || unitPrice <= 0) {
        const passedPrice = item.unitPrice !== undefined ? item.unitPrice : item.price
        if (typeof passedPrice === 'number' && !isNaN(passedPrice) && passedPrice > 0) {
          unitPrice = Number(passedPrice)
        }
      }

      // Fallback to AED/SAR catalog price
      if (unitPrice === null || isNaN(unitPrice) || unitPrice <= 0) {
        const aedObj = rawPricing?.['AED'] || rawPricing?.['SAR'] || 15
        const aedRaw = typeof aedObj === 'object' && aedObj !== null ? (aedObj.price ?? 0) : Number(aedObj)
        unitPrice = Number(aedRaw || 0)
      }

      const itemTotal = unitPrice * item.quantity
      subtotal += itemTotal

      const primaryImg = (p?.images && p.images[0]) || (p?.specifications as any)?.img || item.image || 'https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil.jpg'
      const title = item.name || p?.translations?.en?.title || p?.sku || 'Product Item'
      const titleAr = p?.translations?.ar?.title || title

      processedItems.push({
        productId: p?.id || '00000000-0000-0000-0000-000000000000',
        sku: p?.sku || 'PROD-SKU',
        productNameSnapshot: {
          en: title,
          ar: titleAr,
          title,
          image: primaryImg,
          imageUrl: primaryImg,
        },
        unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotal,
      })
    }

    const shippingCalculation = await shippingService.calculateShippingCost({
      methodId: input.shippingMethodId,
      currency,
      subtotal,
    })

    const finalShippingCost = input.shippingCost !== undefined ? input.shippingCost : shippingCalculation.cost
    const vatRate = currency === 'SAR' ? 0.15 : (currency === 'AED' ? 0.05 : 0)
    const taxAmount = Number((subtotal * vatRate).toFixed(2))
    const totalAmount = subtotal + finalShippingCost + taxAmount

    // B2B Corporate Credit Check
    const paymentMethodType = input.paymentMethodType || (input.paymentMethod ? input.paymentMethod.toUpperCase() : 'CARD')
    if (paymentMethodType === 'CREDIT_TERMS') {
      if (!customerProfile) {
        throw new Error('A registered corporate account is required to place orders on credit terms.')
      }
      const availCredit = Number(customerProfile.availableCredit || 0)
      if (availCredit < totalAmount) {
        throw new Error(`Insufficient corporate credit limit. Available: ${availCredit.toFixed(2)} ${currency}, Total: ${totalAmount.toFixed(2)} ${currency}`)
      }

      // Deduct credit
      const newAvail = Math.max(0, availCredit - totalAmount)
      await this.db
        .update(customers)
        .set({ availableCredit: newAvail.toFixed(2) })
        .where(eq(customers.id, customerProfile.id))
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    const initialStatus = paymentMethodType === 'CREDIT_TERMS' || paymentMethodType === 'PURCHASE_ORDER'
      ? 'processing'
      : (paymentMethodType === 'BANK_TRANSFER' ? 'pending_payment' : 'pending')

    const shippingSnapshot = {
      ...(input.shippingAddressSnapshot || {}),
      shippingMethod: {
        id: shippingCalculation.methodId,
        name: shippingCalculation.methodName,
        arabicName: shippingCalculation.arabicMethodName,
        estimatedDays: shippingCalculation.estimatedDays,
        cost: finalShippingCost,
        currency,
      },
    }

    const [newOrder] = await this.db
      .insert(orders)
      .values({
        orderNumber,
        customerId: input.customerId,
        status: initialStatus,
        currency,
        subtotal: subtotal.toFixed(2),
        shippingCost: finalShippingCost.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        paymentMethodType,
        paymentReceiptUrl: input.paymentReceiptUrl || null,
        poDocumentUrl: input.poDocumentUrl || null,
        poNumber: input.poNumber || null,
        quotationId: input.quotationId ? (input.quotationId as any) : null,
        shippingAddressSnapshot: shippingSnapshot,
        billingAddressSnapshot: input.billingAddressSnapshot || {},
      })
      .returning()

    for (const item of processedItems) {
      await this.db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId !== '00000000-0000-0000-0000-000000000000' ? item.productId : null,
        sku: item.sku,
        productNameSnapshot: item.productNameSnapshot,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        totalPrice: item.totalPrice.toFixed(2),
      })

      if (item.productId && item.productId !== '00000000-0000-0000-0000-000000000000') {
        try {
          await this.db
            .update(products)
            .set({
              stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId))
        } catch (err) {
          console.warn('Stock update skipped:', err)
        }
      }
    }

    return this.getOrderById(newOrder.id)
  }

  async getOrders(options: {
    status?: string
    customerId?: string
    limit?: number
    page?: number
    sortBy?: string
    sortOrder?: string
    search?: string
  }) {
    const limit = options.limit || 20
    const page = options.page || 1
    const offset = (page - 1) * limit
    const sortOrder = options.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc'
    const sortBy = options.sortBy || 'date'

    const conditions = []
    if (options.status) {
      const statuses = options.status.split(',').map((s) => s.trim().toLowerCase())
      if (statuses.length === 1) {
        conditions.push(eq(orders.status, statuses[0]))
      } else {
        conditions.push(sql`${orders.status} IN (${sql.join(statuses.map((s) => sql`${s}`), sql`, `)})`)
      }
    }
    if (options.customerId) {
      conditions.push(eq(orders.customerId, options.customerId))
    }
    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim()}%`
      conditions.push(sql`(${orders.orderNumber} ILIKE ${q} OR (${orders.shippingAddressSnapshot}->>'fullName') ILIKE ${q} OR (${orders.shippingAddressSnapshot}->>'email') ILIKE ${q})`)
    }

    const whereClause = conditions.length ? sql.join(conditions, sql` AND `) : undefined

    const [totalCountResult] = await this.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(orders)
      .where(whereClause)

    let orderExpr = sortOrder === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt)
    if (sortBy === 'total') {
      orderExpr = sortOrder === 'asc' ? asc(orders.totalAmount) : desc(orders.totalAmount)
    } else if (sortBy === 'id' || sortBy === 'orderNumber') {
      orderExpr = sortOrder === 'asc' ? asc(orders.orderNumber) : desc(orders.orderNumber)
    }

    const items = await this.db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset)

    const enriched = await Promise.all(
      items.map(async (order) => {
        const itemRecords = await this.db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
        
        let customerName = 'Guest Customer'
        let customerEmail = 'guest@example.com'
        let customerCity = 'Dubai'

        if (order.customerId) {
          const [cust] = await this.db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
          if (cust) {
            customerName = `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || cust.email
            customerEmail = cust.email
          }
        } else if (order.shippingAddressSnapshot) {
          const addr = order.shippingAddressSnapshot as any
          if (addr.fullName || addr.recipientName) customerName = addr.fullName || addr.recipientName
          if (addr.city) customerCity = addr.city
        }

        const totalNum = parseFloat(order.totalAmount || '0')
        const subtotalNum = parseFloat(order.subtotal || '0')
        const shippingNum = parseFloat(order.shippingCost || '0')

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status.toUpperCase(),
          currency: order.currency,
          subtotal: subtotalNum,
          shippingCost: shippingNum,
          shippingAmount: shippingNum,
          totalAmount: totalNum,
          total: totalNum,
          customerName,
          customerEmail,
          customerCity,
          itemCount: itemRecords.length || 1,
          shippingAddressSnapshot: order.shippingAddressSnapshot,
          billingAddressSnapshot: order.billingAddressSnapshot,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        }
      })
    )

    const total = totalCountResult?.count ?? enriched.length
    return { items: enriched, page, limit, total }
  }

  async getOrderById(id: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1)
    if (!order) return null

    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, id))

    let customerDetails = null
    if (order.customerId) {
      const [cust] = await this.db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
      customerDetails = cust || null
    }

    const totalNum = parseFloat(order.totalAmount || '0')
    const subtotalNum = parseFloat(order.subtotal || '0')
    const shippingNum = parseFloat(order.shippingCost || '0')
    const taxNum = parseFloat(order.taxAmount || '0')
    const discountNum = parseFloat(order.discountAmount || '0')

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toUpperCase(),
      currency: order.currency,
      subtotal: subtotalNum,
      shippingCost: shippingNum,
      shippingAmount: shippingNum,
      taxAmount: taxNum,
      discountAmount: discountNum,
      totalAmount: totalNum,
      total: totalNum,
      customer: customerDetails,
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      billingAddressSnapshot: order.billingAddressSnapshot,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: items.map((i) => {
        const snap = (i.productNameSnapshot || {}) as any
        const title = typeof snap === 'string' ? snap : (snap.en || snap.title || snap.name || i.sku || 'Product')
        const image = typeof snap === 'object' && snap !== null ? (snap.imageUrl || snap.image || snap.img || null) : null
        const unitP = parseFloat(i.unitPrice || '0')
        const totP = parseFloat(i.totalPrice || '0')

        return {
          id: i.id,
          productId: i.productId,
          sku: i.sku,
          productTitle: title,
          name: title,
          productNameSnapshot: i.productNameSnapshot,
          unitPrice: unitP,
          price: unitP,
          quantity: i.quantity,
          qty: i.quantity,
          totalPrice: totP,
          imageUrl: image,
          image: image,
        }
      }),
    }
  }

  async updateOrderStatus(id: string, status: string) {
    const cleanStatus = status.toLowerCase()
    const [updated] = await this.db
      .update(orders)
      .set({ status: cleanStatus, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()
    return updated
  }
}

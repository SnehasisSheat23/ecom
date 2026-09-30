import crypto from 'crypto'
import { eq, or, sql, desc, asc, inArray } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { orders, orderItems, products, customers } from '../../database/schema.js'
import { ProductsService } from '../products/products.service.js'
import { shippingService } from '../shipping/shipping.service.js'
import { notify } from '../notifications/index.js'

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

  private async getNextOrderSequence(): Promise<number> {
    try {
      await this.db.execute(sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 100001;`)
      const res = await this.db.execute(sql`SELECT nextval('order_number_seq') as seq;`)
      const rows = (res as any)?.rows || res
      const rawSeq = rows?.[0]?.seq
      if (rawSeq) {
        return parseInt(String(rawSeq), 10)
      }
    } catch (err) {
      console.warn('Postgres sequence nextval error, using fallback:', err)
    }

    try {
      const [countRow] = await this.db.select({ count: sql<number>`cast(count(*) as integer)` }).from(orders)
      return 100001 + (countRow?.count || 0)
    } catch {
      return Math.floor(100000 + Math.random() * 900000)
    }
  }

  async createOrder(input: CreateOrderInput): Promise<any> {
    const currency = (input.currency || 'SAR').toUpperCase()

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
      // Find product by ID (if valid UUID) or SKU
      const isUuid = Boolean(item.productId && /^[0-9a-fA-F-]{36}$/.test(item.productId))
      let product = isUuid
        ? await this.db.select().from(products).where(eq(products.id, item.productId)).limit(1)
        : []

      if (!product[0] && item.productId) {
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

    // Generate atomic 6-digit incremental Order ID (e.g. ORD-100001)
    const nextSeq = await this.getNextOrderSequence()
    const isB2BQuote = Boolean(input.quotationId)
    const orderNumber = isB2BQuote ? `ORD-Q-${nextSeq}` : `ORD-${nextSeq}`

    const isOnlinePayment = paymentMethodType === 'CARD' || 
                            paymentMethodType === 'MADA' || 
                            paymentMethodType === 'APPLE_PAY' || 
                            (input.paymentMethod && input.paymentMethod.toUpperCase() === 'NALPAY')

    const initialStatus = isOnlinePayment 
      ? 'checkout_pending' 
      : (paymentMethodType === 'CREDIT_TERMS' || paymentMethodType === 'PURCHASE_ORDER'
          ? 'processing'
          : (paymentMethodType === 'BANK_TRANSFER' ? 'pending_payment' : 'pending'))

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

      // ONLY deduct stock immediately if NOT an unconfirmed online checkout!
      // (For online payments, stock is safely deducted once payment is confirmed)
      if (initialStatus !== 'checkout_pending' && item.productId && item.productId !== '00000000-0000-0000-0000-000000000000') {
        try {
          await this.db
            .update(products)
            .set({
              stockQuantity: sql`GREATEST(0, ${products.stockQuantity} - ${item.quantity})`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId))
        } catch (err) {
          console.warn('Stock update skipped:', err)
        }
      }
    }

    // Generate NalPay payment link if online card payment
    let paymentLinkUrl: string | null = null
    let nalpayPaymentLinkId: string | null = null

    if (isOnlinePayment) {
      try {
        const nalpayKey = process.env.NALPAY_SECRET_KEY || 'sk_test_lRKb9Q1jp6pjmxOHE5IFP5oPXd1YdE3r'
        const nalpayAmountHalalas = Math.round(totalAmount * 100)
        const nalpayRes = await fetch('https://nalpay.io/v1/payment_links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nalpayKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            amount: nalpayAmountHalalas,
            currency: (currency || 'SAR').toUpperCase(),
            description: `Order #${orderNumber}`,
            metadata: {
              orderNumber,
              orderId: newOrder.id,
              customerId: input.customerId || null,
            },
          }),
        })

        if (nalpayRes.ok) {
          const nalpayData: any = await nalpayRes.json()
          paymentLinkUrl = nalpayData.url || null
          nalpayPaymentLinkId = nalpayData.id || null
          
          const updatedSnapshot = {
            ...shippingSnapshot,
            nalpayPaymentLinkId,
            nalpayUrl: paymentLinkUrl,
          }

          await this.db
            .update(orders)
            .set({ 
              paymentReceiptUrl: paymentLinkUrl,
              shippingAddressSnapshot: updatedSnapshot,
            })
            .where(eq(orders.id, newOrder.id))
        } else {
          const errText = await nalpayRes.text()
          console.error('[NalPay] Link creation failed:', nalpayRes.status, errText)
        }
      } catch (err: any) {
        console.error('[NalPay] Error communicating with NalPay API:', err.message)
      }
    }

    const createdOrder = await this.getOrderById(newOrder.id)

    // Fire-and-forget notification dispatch (only for non-pending checkouts)
    if (createdOrder && initialStatus !== 'checkout_pending') {
      const custObj = (createdOrder as any).customer || customerProfile
      const shipSnap = (createdOrder.shippingAddressSnapshot as any) || {}
      const customerName = custObj?.firstName
        ? `${custObj.firstName} ${custObj.lastName || ''}`.trim()
        : (shipSnap.fullName || shipSnap.recipientName || 'Valued Customer')
      const customerEmail = custObj?.email || shipSnap.email || (input as any).guestEmail || (input as any).email || 'customer@example.com'
      const customerPhone = custObj?.phone || shipSnap.phone || null

      const isCorporate = Boolean(
        custObj?.customerGroup === 'corporate' ||
        custObj?.customerGroup === 'wholesale' ||
        custObj?.companyName ||
        shipSnap.companyName ||
        createdOrder.poNumber ||
        (createdOrder as any).poNumber
      )
      const companyName = custObj?.companyName || shipSnap.companyName || null
      const poNumber = createdOrder.poNumber || (createdOrder as any).poNumber || null
      const vatNumber = custObj?.companyTaxId || custObj?.crNumber || shipSnap.vatNumber || null

      notify('ORDER_PLACED', {
        orderNumber: createdOrder.orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        poNumber,
        vatNumber,
        isCorporate,
        totalAmount: createdOrder.totalAmount,
        subtotal: createdOrder.subtotal,
        shippingCost: createdOrder.shippingCost,
        vatAmount: createdOrder.taxAmount,
        currency: createdOrder.currency,
        paymentMethod: createdOrder.paymentMethodType,
        shippingAddress: [
          (createdOrder.shippingAddressSnapshot as any)?.addressLine1 || (createdOrder.shippingAddressSnapshot as any)?.line1,
          (createdOrder.shippingAddressSnapshot as any)?.city,
          (createdOrder.shippingAddressSnapshot as any)?.country,
        ]
          .filter(Boolean)
          .join(', '),
        items: (createdOrder.items || []).map((item: any) => ({
          name: item.title || item.name || 'Product Item',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
          sku: item.sku,
          image: item.image,
        })),
      })
    }

    return {
      ...(createdOrder || newOrder),
      paymentUrl: paymentLinkUrl,
      nalpayPaymentLinkId,
    }
  }

  async getOrders(options: {
    status?: string
    customerId?: string
    email?: string
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
    } else {
      // By default, exclude uncommitted checkout pending attempts from standard order queues
      conditions.push(sql`lower(${orders.status}) != 'checkout_pending'`)
    }
    if (options.customerId && options.email) {
      const em = options.email.trim().toLowerCase()
      conditions.push(sql`(${orders.customerId} = ${options.customerId} OR (${orders.shippingAddressSnapshot}->>'email') ILIKE ${em})`)
    } else if (options.customerId) {
      conditions.push(eq(orders.customerId, options.customerId))
    } else if (options.email) {
      const em = options.email.trim().toLowerCase()
      conditions.push(sql`(${orders.shippingAddressSnapshot}->>'email') ILIKE ${em}`)
    }
    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim()}%`
      conditions.push(sql`(${orders.orderNumber} ILIKE ${q} OR (${orders.shippingAddressSnapshot}->>'fullName') ILIKE ${q} OR (${orders.shippingAddressSnapshot}->>'email') ILIKE ${q} OR ${orders.poNumber} ILIKE ${q})`)
    }

    const whereClause = conditions.length ? sql.join(conditions, sql` AND `) : undefined

    let orderExpr = sortOrder === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt)
    if (sortBy === 'total') {
      orderExpr = sortOrder === 'asc' ? asc(orders.totalAmount) : desc(orders.totalAmount)
    } else if (sortBy === 'id' || sortBy === 'orderNumber') {
      orderExpr = sortOrder === 'asc' ? asc(orders.orderNumber) : desc(orders.orderNumber)
    }

    // Execute count, paginated items, and stats concurrently
    const [[totalCountResult], items, [statsResult]] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(orders)
        .where(whereClause),
      this.db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset),
      this.db
        .select({
          totalRevenue: sql<number>`cast(coalesce(sum(cast(${orders.totalAmount} as numeric)), 0) as float)`,
          deliveredOrders: sql<number>`cast(count(case when lower(${orders.status}) in ('delivered', 'shipped') then 1 end) as integer)`,
          pendingOrders: sql<number>`cast(count(case when lower(${orders.status}) in ('pending', 'pending_payment', 'processing', 'confirmed') then 1 end) as integer)`,
          cancelledOrders: sql<number>`cast(count(case when lower(${orders.status}) in ('cancelled', 'refunded') then 1 end) as integer)`,
        })
        .from(orders),
    ])

    // Batch fetch orderItems and customers to eliminate N+1 queries
    const orderIds = items.map((o) => o.id)
    const customerIds = Array.from(new Set(items.map((o) => o.customerId).filter(Boolean))) as string[]

    const [allOrderItems, allCustomers] = await Promise.all([
      orderIds.length > 0
        ? this.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
        : Promise.resolve([]),
      customerIds.length > 0
        ? this.db.select().from(customers).where(inArray(customers.id, customerIds))
        : Promise.resolve([]),
    ])

    const itemsByOrderId = new Map<string, typeof allOrderItems>()
    for (const item of allOrderItems) {
      const list = itemsByOrderId.get(item.orderId) || []
      list.push(item)
      itemsByOrderId.set(item.orderId, list)
    }

    const customerMap = new Map<string, (typeof allCustomers)[0]>()
    for (const cust of allCustomers) {
      customerMap.set(cust.id, cust)
    }

    const enriched = items.map((order) => {
      const itemRecords = itemsByOrderId.get(order.id) || []
      
      let customerDetails: any = null
      let customerName = 'Guest Customer'
      let customerEmail = 'guest@example.com'
      let customerCity = 'Riyadh'

      if (order.customerId && customerMap.has(order.customerId)) {
        const cust = customerMap.get(order.customerId)!
        customerDetails = cust
        customerName = `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || cust.email
        customerEmail = cust.email
      } else if (order.shippingAddressSnapshot) {
        const addr = order.shippingAddressSnapshot as any
        if (addr.fullName || addr.recipientName) customerName = addr.fullName || addr.recipientName
        if (addr.city) customerCity = addr.city
        if (addr.email) customerEmail = addr.email
      }

      const totalNum = parseFloat(order.totalAmount || '0')
      const subtotalNum = parseFloat(order.subtotal || '0')
      const shippingNum = parseFloat(order.shippingCost || '0')

      const parsedItems = itemRecords.map((i) => {
        const snap = (i.productNameSnapshot || {}) as any
        const title = typeof snap === 'string' ? snap : (snap.en || snap.title || snap.name || i.sku || 'Product')
        const image = typeof snap === 'object' && snap !== null ? (snap.imageUrl || snap.image || snap.img || null) : null
        const unitP = parseFloat(i.unitPrice || '0')
        const totP = parseFloat(i.totalPrice || '0')

        return {
          id: i.id,
          productId: i.productId,
          name: title,
          image: image,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: unitP,
          totalPrice: totP,
          price: unitP,
        }
      })

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
        customer: customerDetails,
        itemCount: parsedItems.length || 1,
        items: parsedItems,
        paymentMethodType: order.paymentMethodType,
        paymentMethod: order.paymentMethodType,
        poNumber: order.poNumber,
        poDocumentUrl: order.poDocumentUrl,
        paymentReceiptUrl: order.paymentReceiptUrl,
        quotationId: order.quotationId,
        shippingAddressSnapshot: order.shippingAddressSnapshot,
        billingAddressSnapshot: order.billingAddressSnapshot,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    })

    const total = totalCountResult?.count ?? enriched.length
    return {
      items: enriched,
      page,
      limit,
      total,
      stats: {
        totalOrders: total,
        totalRevenue: statsResult?.totalRevenue || 0,
        fulfilledOrders: statsResult?.deliveredOrders || 0,
        pendingOrders: statsResult?.pendingOrders || 0,
        cancelledOrders: statsResult?.cancelledOrders || 0,
      },
    }
  }

  async getOrderById(idOrNumber: string) {
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrNumber)
    const [order] = await this.db
      .select()
      .from(orders)
      .where(isUuid ? or(eq(orders.id, idOrNumber), eq(orders.orderNumber, idOrNumber)) : eq(orders.orderNumber, idOrNumber))
      .limit(1)
    if (!order) return null

    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, order.id))

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
      customerRecord: customerDetails,
      paymentMethodType: order.paymentMethodType,
      poNumber: order.poNumber,
      poDocumentUrl: order.poDocumentUrl,
      paymentReceiptUrl: order.paymentReceiptUrl,
      quotationId: order.quotationId,
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

    if (updated) {
      const fullOrder = await this.getOrderById(updated.id)
      if (fullOrder) {
        const custObj = (fullOrder as any).customer
        const shipSnap = (fullOrder.shippingAddressSnapshot as any) || {}
        const customerName = custObj?.firstName
          ? `${custObj.firstName} ${custObj.lastName || ''}`.trim()
          : (shipSnap.fullName || shipSnap.recipientName || 'Valued Customer')
        const customerEmail = custObj?.email || shipSnap.email || 'customer@example.com'
        const customerPhone = custObj?.phone || shipSnap.phone || null

        notify('ORDER_STATUS_CHANGED', {
          orderNumber: fullOrder.orderNumber,
          customerName,
          customerEmail,
          customerPhone,
          newStatus: cleanStatus,
          currency: fullOrder.currency,
          totalAmount: fullOrder.totalAmount,
        })
      }
    }

    return updated
  }

  /**
   * Idempotently confirm a paid order:
   * 1. Updates status to 'confirmed'
   * 2. Safely decrements inventory (GREATEST(0, stock - qty))
   * 3. Converts customer cart
   * 4. Dispatches official ORDER_PLACED notification
   */
  async confirmPaidOrder(orderId: string, paymentDetails?: any) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    const currentStatus = (order.status || '').toLowerCase()
    // Idempotency check: if already confirmed or fulfilled, return existing full order
    if (['confirmed', 'paid', 'processing', 'shipped', 'delivered'].includes(currentStatus)) {
      return this.getOrderById(orderId)
    }

    const shipSnap = (order.shippingAddressSnapshot as any) || {}
    const updatedShipSnap = {
      ...shipSnap,
      paymentConfirmedAt: new Date().toISOString(),
      nalpayTransaction: paymentDetails || null,
    }

    // 1. Update order status to confirmed
    await this.db
      .update(orders)
      .set({
        status: 'confirmed',
        shippingAddressSnapshot: updatedShipSnap,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    // 2. Safely deduct inventory for all order items
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    for (const item of items) {
      if (item.productId && item.productId !== '00000000-0000-0000-0000-000000000000') {
        try {
          await this.db
            .update(products)
            .set({
              stockQuantity: sql`GREATEST(0, ${products.stockQuantity} - ${item.quantity})`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.productId))
        } catch (err) {
          console.warn(`[Inventory] Stock deduction failed for product ${item.productId}:`, err)
        }
      }
    }

    // 3. Mark customer cart as converted and clear items
    if (order.customerId) {
      try {
        const { carts, cartItems } = await import('../../database/schema.js')
        const [customerCart] = await this.db.select().from(carts).where(eq(carts.customerId, order.customerId)).limit(1)
        if (customerCart) {
          await this.db.update(carts).set({ status: 'converted', updatedAt: new Date() }).where(eq(carts.id, customerCart.id))
          await this.db.delete(cartItems).where(eq(cartItems.cartId, customerCart.id))
        }
      } catch (cartErr) {
        console.warn('[Cart] Cart conversion skipped:', cartErr)
      }
    }

    // 4. Dispatch Official Order Confirmed notification
    const fullOrder = await this.getOrderById(orderId)
    if (fullOrder) {
      const custObj = (fullOrder as any).customer
      const snapshot = (fullOrder.shippingAddressSnapshot as any) || {}
      const customerName = custObj?.firstName
        ? `${custObj.firstName} ${custObj.lastName || ''}`.trim()
        : (snapshot.fullName || snapshot.recipientName || 'Valued Customer')
      const customerEmail = custObj?.email || snapshot.email || 'customer@example.com'
      const customerPhone = custObj?.phone || snapshot.phone || null

      const isCorporate = Boolean(
        custObj?.customerGroup === 'corporate' ||
        custObj?.customerGroup === 'wholesale' ||
        custObj?.companyName ||
        snapshot.companyName ||
        fullOrder.poNumber ||
        (fullOrder as any).poNumber
      )
      const companyName = custObj?.companyName || snapshot.companyName || null
      const poNumber = fullOrder.poNumber || (fullOrder as any).poNumber || null
      const vatNumber = custObj?.companyTaxId || custObj?.crNumber || snapshot.vatNumber || null

      notify('ORDER_PLACED', {
        orderNumber: fullOrder.orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        poNumber,
        vatNumber,
        isCorporate,
        totalAmount: fullOrder.totalAmount,
        subtotal: fullOrder.subtotal,
        shippingCost: fullOrder.shippingCost,
        vatAmount: fullOrder.taxAmount,
        currency: fullOrder.currency,
        paymentMethod: 'NalPay (Mada / Visa / Apple Pay)',
        shippingAddress: [
          snapshot.addressLine1 || snapshot.address || snapshot.line1,
          snapshot.city,
          snapshot.country,
        ].filter(Boolean).join(', '),
        items: (fullOrder.items || []).map((item: any) => ({
          name: item.title || item.name || 'Product Item',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
          sku: item.sku,
          image: item.image,
        })),
      })
    }

    return fullOrder
  }

  /**
   * Verify an order's payment status with NalPay gateway
   */
  async verifyNalPayPayment(orderId: string) {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    const currentStatus = (order.status || '').toLowerCase()
    if (['confirmed', 'paid', 'processing', 'shipped', 'delivered'].includes(currentStatus)) {
      const fullOrder = await this.getOrderById(orderId)
      return { paid: true, status: order.status, order: fullOrder }
    }

    const shipSnap = (order.shippingAddressSnapshot as any) || {}
    const plinkId = shipSnap.nalpayPaymentLinkId

    if (!plinkId) {
      const fullOrder = await this.getOrderById(orderId)
      return { paid: false, status: order.status, order: fullOrder }
    }

    try {
      const nalpayKey = process.env.NALPAY_SECRET_KEY || 'sk_test_lRKb9Q1jp6pjmxOHE5IFP5oPXd1YdE3r'
      const res = await fetch(`https://nalpay.io/v1/payment_links/${plinkId}`, {
        headers: {
          'Authorization': `Bearer ${nalpayKey}`,
        },
      })

      if (res.ok) {
        const plinkData = await res.json() as any
        const isPaid = plinkData.status === 'paid' || (plinkData.amount_paid && plinkData.amount_paid >= plinkData.amount)
        if (isPaid) {
          const confirmed = await this.confirmPaidOrder(orderId, plinkData)
          return { paid: true, status: 'confirmed', order: confirmed }
        }
      } else {
        console.warn(`[NalPay] Verification returned status ${res.status} for link ${plinkId}`)
      }
    } catch (err: any) {
      console.error('[NalPay] Payment verification request failed:', err.message)
    }

    const fullOrder = await this.getOrderById(orderId)
    return { paid: false, status: order.status, order: fullOrder }
  }
}

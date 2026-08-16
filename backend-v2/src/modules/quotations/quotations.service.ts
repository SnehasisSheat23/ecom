import { eq, desc, and, sql, or } from 'drizzle-orm'
import { getDatabase } from '../../lib/db.js'
import { quotations, quotationItems, products, customers, orders, orderItems } from '../../database/schema.js'

export interface CreateQuotationItemInput {
  productId: string
  quantity?: number
  requestedQuantity?: number
  unitPrice?: number
  name?: string
  image?: string
}

export interface CreateQuotationRequestInput {
  customerId?: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  taxNumber?: string
  currency?: string
  customerNotes?: string
  items: CreateQuotationItemInput[]
}

export interface AdminUpdateQuoteItemInput {
  id?: string
  productId?: string
  quotedUnitPrice: number
}

export interface AdminUpdateQuotationInput {
  status?: 'pending_review' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'converted'
  items?: AdminUpdateQuoteItemInput[]
  discountAmount?: number
  shippingCost?: number
  taxAmount?: number
  adminNotes?: string
  validUntil?: string | Date
  paymentLink?: string
}

export interface AcceptQuotationInput {
  customerId?: string
  paymentMethodType: 'CARD' | 'MADA' | 'APPLE_PAY' | 'BANK_TRANSFER' | 'PURCHASE_ORDER' | 'CREDIT_TERMS'
  paymentReceiptUrl?: string
  poDocumentUrl?: string
  poNumber?: string
  shippingAddressSnapshot?: Record<string, any>
  billingAddressSnapshot?: Record<string, any>
}

export class QuotationsService {
  private db = getDatabase()

  private generateQuoteNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return `RFQ-${dateStr}-${randomSuffix}`
  }

  async createQuotationRequest(input: CreateQuotationRequestInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error('Quotation request must contain at least one item.')
    }

    const currency = (input.currency || 'SAR').toUpperCase()
    const quoteNumber = this.generateQuoteNumber()

    let subtotal = 0
    const processedItems: {
      productId: string | null
      sku: string
      productNameSnapshot: any
      requestedQuantity: number
      originalUnitPrice: number
      quotedUnitPrice: number
      totalPrice: number
    }[] = []

    for (const item of input.items) {
      let product = await this.db.select().from(products).where(eq(products.id, item.productId)).limit(1)
      if (!product[0]) {
        product = await this.db.select().from(products).where(eq(products.sku, item.productId)).limit(1)
      }

      let originalUnitPrice = 0
      let sku = 'CUSTOM'
      let nameSnapshot: any = { en: item.name || 'Custom Product', image: item.image }

      if (product[0]) {
        const prod = product[0]
        sku = prod.sku || 'SKU'
        const prodPricing = (prod.pricing as any)?.[currency] || (prod.pricing as any)?.['AED'] || (prod.pricing as any)?.['SAR']
        originalUnitPrice = Number(prodPricing?.price || item.unitPrice || 0)
        nameSnapshot = {
          en: prod.translations?.en?.title || item.name || 'Product',
          ar: prod.translations?.ar?.title,
          image: prod.images?.[0] || item.image,
        }
      } else {
        originalUnitPrice = Number(item.unitPrice || 0)
      }

      const qty = Math.max(1, Number(item.quantity || item.requestedQuantity) || 1)
      const quotedUnitPrice = originalUnitPrice // Initial quoted price matches catalog before admin review
      const itemTotal = quotedUnitPrice * qty
      subtotal += itemTotal

      processedItems.push({
        productId: product[0]?.id || null,
        sku,
        productNameSnapshot: nameSnapshot,
        requestedQuantity: qty,
        originalUnitPrice,
        quotedUnitPrice,
        totalPrice: itemTotal,
      })
    }

    // Standard default 14 days validity
    const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    // Default VAT: 15% for SAR, 5% for AED
    const vatRate = currency === 'SAR' ? 0.15 : 0.05
    const taxAmount = Number((subtotal * vatRate).toFixed(2))
    const totalAmount = subtotal + taxAmount

    // Insert into v2_quotations
    const insertedQuote = await this.db
      .insert(quotations)
      .values({
        quoteNumber,
        customerId: input.customerId || null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || null,
        companyName: input.companyName || null,
        taxNumber: input.taxNumber || null,
        status: 'pending_review',
        currency,
        subtotal: subtotal.toFixed(2),
        discountAmount: '0.00',
        shippingCost: '0.00',
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        customerNotes: input.customerNotes || null,
        validUntil,
      })
      .returning()

    const createdQuote = insertedQuote[0]

    // Insert quotation line items
    for (const pItem of processedItems) {
      await this.db.insert(quotationItems).values({
        quotationId: createdQuote.id,
        productId: pItem.productId,
        sku: pItem.sku,
        productNameSnapshot: pItem.productNameSnapshot,
        requestedQuantity: pItem.requestedQuantity,
        originalUnitPrice: pItem.originalUnitPrice.toFixed(2),
        quotedUnitPrice: pItem.quotedUnitPrice.toFixed(2),
        totalPrice: pItem.totalPrice.toFixed(2),
      })
    }

    return this.getQuotationById(createdQuote.id)
  }

  async getQuotations(filters?: { customerId?: string; email?: string; status?: string; search?: string }) {
    let query = this.db.select().from(quotations)
    const conditions: any[] = []

    if (filters?.customerId) {
      conditions.push(eq(quotations.customerId, filters.customerId))
    }
    if (filters?.email) {
      conditions.push(eq(quotations.customerEmail, filters.email))
    }
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(quotations.status, filters.status))
    }
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`
      conditions.push(
        or(
          sql`${quotations.quoteNumber} ILIKE ${searchPattern}`,
          sql`${quotations.customerName} ILIKE ${searchPattern}`,
          sql`${quotations.customerEmail} ILIKE ${searchPattern}`,
          sql`${quotations.companyName} ILIKE ${searchPattern}`
        )
      )
    }

    const quotes = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(quotations.createdAt))
      : await query.orderBy(desc(quotations.createdAt))

    return quotes
  }

  async getQuotationById(id: string) {
    const quoteRes = await this.db.select().from(quotations).where(eq(quotations.id, id)).limit(1)
    if (!quoteRes[0]) {
      // Try search by quoteNumber
      const quoteByNumber = await this.db.select().from(quotations).where(eq(quotations.quoteNumber, id)).limit(1)
      if (!quoteByNumber[0]) throw new Error('Quotation not found')
      return this.enrichQuotationWithItems(quoteByNumber[0])
    }
    return this.enrichQuotationWithItems(quoteRes[0])
  }

  private async enrichQuotationWithItems(quote: typeof quotations.$inferSelect) {
    const items = await this.db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quote.id))

    return {
      ...quote,
      items: items.map(i => ({
        ...i,
        originalUnitPrice: Number(i.originalUnitPrice),
        quotedUnitPrice: Number(i.quotedUnitPrice),
        totalPrice: Number(i.totalPrice),
      })),
      subtotal: Number(quote.subtotal),
      discountAmount: Number(quote.discountAmount),
      shippingCost: Number(quote.shippingCost),
      taxAmount: Number(quote.taxAmount),
      totalAmount: Number(quote.totalAmount),
    }
  }

  async updateQuotationAdmin(id: string, update: AdminUpdateQuotationInput) {
    const existing = await this.getQuotationById(id)
    if (!existing) throw new Error('Quotation not found')

    let subtotal = 0

    // Update item quoted prices if provided
    if (update.items && update.items.length > 0) {
      for (const itemUpdate of update.items) {
        const itemRecord = existing.items.find(i => i.id === itemUpdate.id || (itemUpdate.productId && i.productId === itemUpdate.productId))
        if (itemRecord) {
          const newUnitPrice = Number(itemUpdate.quotedUnitPrice)
          const newTotal = newUnitPrice * itemRecord.requestedQuantity
          await this.db
            .update(quotationItems)
            .set({
              quotedUnitPrice: newUnitPrice.toFixed(2),
              totalPrice: newTotal.toFixed(2),
            })
            .where(eq(quotationItems.id, itemRecord.id))
        }
      }
    }

    // Recalculate exact subtotal from all current quotation line items
    const allDbItems = await this.db.select().from(quotationItems).where(eq(quotationItems.quotationId, existing.id))
    subtotal = allDbItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)

    const discountAmount = update.discountAmount !== undefined ? Number(update.discountAmount) : existing.discountAmount
    const shippingCost = update.shippingCost !== undefined ? Number(update.shippingCost) : existing.shippingCost

    // Recalculate VAT on discounted subtotal
    const discountedSubtotal = Math.max(0, subtotal - discountAmount)
    const vatRate = existing.currency === 'SAR' ? 0.15 : 0.05
    const taxAmount = update.taxAmount !== undefined ? Number(update.taxAmount) : Number((discountedSubtotal * vatRate).toFixed(2))
    const totalAmount = discountedSubtotal + shippingCost + taxAmount

    const newStatus = update.status || 'quoted'

    await this.db
      .update(quotations)
      .set({
        status: newStatus,
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        adminNotes: update.adminNotes !== undefined ? update.adminNotes : existing.adminNotes,
        validUntil: update.validUntil ? new Date(update.validUntil) : existing.validUntil,
        paymentLink: update.paymentLink !== undefined ? update.paymentLink : existing.paymentLink,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, existing.id))

    return this.getQuotationById(existing.id)
  }

  async acceptAndConvertToOrder(id: string, input: AcceptQuotationInput) {
    const quote = await this.getQuotationById(id)
    if (!quote) throw new Error('Quotation not found')

    if (quote.status === 'converted') {
      throw new Error('This quotation has already been converted to an order.')
    }

    // Verify corporate credit if paying by CREDIT_TERMS
    if (input.paymentMethodType === 'CREDIT_TERMS') {
      const customerId = input.customerId || quote.customerId
      if (!customerId) throw new Error('Customer ID is required for credit payment terms.')

      const custRes = await this.db.select().from(customers).where(eq(customers.id, customerId)).limit(1)
      if (!custRes[0]) throw new Error('Customer account not found.')

      const cust = custRes[0]
      const availCredit = Number(cust.availableCredit || 0)
      if (availCredit < quote.totalAmount) {
        throw new Error(`Insufficient corporate credit limit. Available: ${availCredit.toFixed(2)} ${quote.currency}, Order total: ${quote.totalAmount.toFixed(2)} ${quote.currency}`)
      }

      // Deduct available credit
      const newAvail = Math.max(0, availCredit - quote.totalAmount)
      await this.db
        .update(customers)
        .set({ availableCredit: newAvail.toFixed(2) })
        .where(eq(customers.id, cust.id))
    }

    // Create Order in v2_orders
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randSuffix = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `ORD-Q-${dateStr}-${randSuffix}`

    const initialOrderStatus = input.paymentMethodType === 'CREDIT_TERMS' || input.paymentMethodType === 'PURCHASE_ORDER'
      ? 'processing'
      : (input.paymentMethodType === 'BANK_TRANSFER' ? 'pending_payment' : 'completed')

    const newOrder = await this.db
      .insert(orders)
      .values({
        orderNumber,
        customerId: input.customerId || quote.customerId || null,
        status: initialOrderStatus,
        currency: quote.currency,
        subtotal: quote.subtotal.toFixed(2),
        shippingCost: quote.shippingCost.toFixed(2),
        taxAmount: quote.taxAmount.toFixed(2),
        discountAmount: quote.discountAmount.toFixed(2),
        totalAmount: quote.totalAmount.toFixed(2),
        paymentMethodType: input.paymentMethodType,
        paymentReceiptUrl: input.paymentReceiptUrl || null,
        poDocumentUrl: input.poDocumentUrl || null,
        poNumber: input.poNumber || null,
        quotationId: quote.id,
        shippingAddressSnapshot: input.shippingAddressSnapshot || null,
        billingAddressSnapshot: input.billingAddressSnapshot || null,
      })
      .returning()

    const createdOrder = newOrder[0]

    // Create Order Items
    for (const qItem of quote.items) {
      await this.db.insert(orderItems).values({
        orderId: createdOrder.id,
        productId: qItem.productId,
        sku: qItem.sku,
        productNameSnapshot: qItem.productNameSnapshot,
        unitPrice: qItem.quotedUnitPrice.toFixed(2),
        quantity: qItem.requestedQuantity,
        totalPrice: qItem.totalPrice.toFixed(2),
      })
    }

    // Update Quotation status to 'converted'
    await this.db
      .update(quotations)
      .set({
        status: 'converted',
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, quote.id))

    return {
      success: true,
      order: createdOrder,
      quotation: await this.getQuotationById(quote.id),
    }
  }
}

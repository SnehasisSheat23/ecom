import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { PaginatedResult } from '../../lib/types.js'
import type { Database } from '../../lib/db.js'
import { AppError } from '../../lib/errors.js'
import { productImages, products, variants, variantPrices } from '../catalog/catalog.schema.js'
import { mediaAssets } from '../media/media.schema.js'
import { carts, cartItems } from '../cart/cart.schema.js'
import { customers } from '../customers/customers.schema.js'
import {
  orderItems,
  orders,
  orderSequences,
  paymentIntents,
} from './orders.schema.js'
import type {
  OrderDetail,
  OrderFilters,
  OrderItemRecord,
  OrderListItem,
  OrderListItemWithDetails,
  OrderRecord,
  OrderVariantSnapshot,
  PaymentIntentRecord,
  AddressSnapshot,
  OrderStatus,
  OrderListItemSummary,
  OrderListItemSummaryFilters,
  CustomerOrderListItem,
} from './orders.types.js'
import { shippingMethodSnapshotSchema, storedAddressSnapshotSchema } from './orders.validators.js'

const parseSnapshot = <T>(value: unknown, parser: { parse: (input: unknown) => T }, field: string): T => {
  try {
    return parser.parse(value)
  } catch {
    throw new AppError(`Invalid stored ${field}`, 500, `invalid-${field}`)
  }
}

const parseAddressSnapshot = (value: unknown): AddressSnapshot => {
  try {
    return storedAddressSnapshotSchema.parse(value) as AddressSnapshot
  } catch {
    return { fullName: 'Customer', line1: '', line2: null, city: '', state: '', postalCode: '', phone: null, country: 'IN' }
  }
}

const mapOrder = (row: typeof orders.$inferSelect): OrderRecord => ({
  ...row,
  partnerId: row.partnerId,
  checkoutGroupId: row.checkoutGroupId,
  payoutStatus: row.payoutStatus,
  trackingNumber: row.trackingNumber,
  trackingUrl: row.trackingUrl,
  shippingAddressSnapshot: parseSnapshot(
    row.shippingAddressSnapshot,
    storedAddressSnapshotSchema,
    'shipping-address-snapshot',
  ),
  billingAddressSnapshot:
    row.billingAddressSnapshot === null
      ? null
      : parseSnapshot(
          row.billingAddressSnapshot,
          storedAddressSnapshotSchema,
          'billing-address-snapshot',
        ),
  shippingMethodSnapshot: parseSnapshot(
    row.shippingMethodSnapshot ?? null,
    shippingMethodSnapshotSchema,
    'shipping-method-snapshot',
  ),
  metadata: row.metadata as Record<string, unknown>,
})

const mapOrderItem = (row: typeof orderItems.$inferSelect): OrderItemRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  orderId: row.orderId,
  productId: row.productId,
  variantId: row.variantId,
  partnerId: row.partnerId,
  productTitle: row.productTitleSnapshot,
  variantTitle: row.variantTitleSnapshot,
  sku: row.skuSnapshot,
  unitPrice: row.unitPriceSnapshot,
  quantity: row.quantity,
  lineTotal: row.lineTotal,
  imageUrl: row.imageUrlSnapshot,
  returnStatus: row.returnStatus,
  metadata: row.metadata as Record<string, unknown>,
  createdAt: row.createdAt,
})

const mapPaymentIntent = (row: typeof paymentIntents.$inferSelect): PaymentIntentRecord => ({
  ...row,
  metadata: row.metadata as Record<string, unknown>,
})

export class OrdersRepository {
  constructor(private readonly db: Database) {}

  getDb(): Database {
    return this.db
  }

  async transaction<T>(callback: (repository: OrdersRepository) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => callback(new OrdersRepository(tx as Database)))
  }

  async nextOrderNumber(tenantId: string): Promise<string> {
    const result = await this.db.execute(sql<{ nextValue: number }>`
      INSERT INTO order_sequences (tenant_id, next_value, updated_at)
      VALUES (${tenantId}, 2, NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET next_value = order_sequences.next_value + 1, updated_at = NOW()
      RETURNING order_sequences.next_value - 1 AS "nextValue"
    `)

    const nextValue = Number((result.rows[0] as { nextValue: number }).nextValue)
    return `ORD-${String(nextValue).padStart(4, '0')}`
  }

  async lockCart(tenantId: string, cartId: string) {
    const result = await this.db.execute(sql`
      SELECT id
      FROM carts
      WHERE tenant_id = ${tenantId} AND id = ${cartId}
      FOR UPDATE
    `)

    return result.rows[0] ?? null
  }

  async findCartById(tenantId: string, cartId: string) {
    const [row] = await this.db
      .select()
      .from(carts)
      .where(and(eq(carts.tenantId, tenantId), eq(carts.id, cartId)))
      .limit(1)
    return row ?? null
  }

  async listCartItems(tenantId: string, cartId: string) {
    return this.db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.tenantId, tenantId), eq(cartItems.cartId, cartId)))
  }

  async getVariantSnapshots(tenantId: string, variantIds: string[]): Promise<OrderVariantSnapshot[]> {
    if (variantIds.length === 0) {
      return []
    }

    const imageSubquery = this.db
      .select({
        productId: productImages.productId,
        url: mediaAssets.url,
      })
      .from(productImages)
      .innerJoin(mediaAssets, eq(productImages.mediaId, mediaAssets.id))
      .where(eq(productImages.tenantId, tenantId))
      .as('product_image_subquery')

    const rows = await this.db
      .select({
        variantId: variants.id,
        productId: variants.productId,
        partnerId: products.partnerId,
        sku: variants.sku,
        variantTitle: variants.title,
        productTitle: products.title,
        price: variantPrices.price,
        specifications: products.specifications,
        trackInventory: variants.trackInventory,
        weightGrams: variants.weightGrams,
        productType: products.productType,
        productStatus: products.status,
        approvalStatus: products.approvalStatus,
        variantDeletedAt: variants.deletedAt,
        productDeletedAt: products.deletedAt,
        imageUrl: imageSubquery.url,
      })
      .from(variants)
      .innerJoin(products, and(eq(variants.productId, products.id), eq(products.tenantId, tenantId)))
      .leftJoin(variantPrices, and(eq(variantPrices.variantId, variants.id), eq(variantPrices.tenantId, tenantId)))
      .leftJoin(imageSubquery, eq(imageSubquery.productId, products.id))
      .where(and(eq(variants.tenantId, tenantId), inArray(variants.id, variantIds)))

    const byVariant = new Map<string, OrderVariantSnapshot>()
    for (const row of rows) {
      if (!byVariant.has(row.variantId)) {
        const specPrice = (row.specifications as any)?.price ? parseInt(String((row.specifications as any).price), 10) * 100 : 0
        const resolvedPrice = row.price && row.price > 0 ? row.price : specPrice

        byVariant.set(row.variantId, {
          variantId: row.variantId,
          productId: row.productId,
          partnerId: row.partnerId,
          sku: row.sku,
          variantTitle: row.variantTitle,
          productTitle: row.productTitle,
          price: resolvedPrice,
          trackInventory: row.trackInventory,
          weightGrams: row.weightGrams,
          productType: row.productType,
          productStatus: row.productStatus,
          approvalStatus: row.approvalStatus,
          isDeleted: Boolean(row.variantDeletedAt || row.productDeletedAt),
          imageUrl: row.imageUrl ?? null,
        })
      }
    }

    return Array.from(byVariant.values())
  }

  async createOrder(input: typeof orders.$inferInsert): Promise<OrderRecord> {
    const [row] = await this.db.insert(orders).values(input).returning()
    return mapOrder(row)
  }

  async createOrderItems(input: Array<typeof orderItems.$inferInsert>): Promise<OrderItemRecord[]> {
    const sanitizedInput = input.map((item) => ({
      ...item,
      imageUrlSnapshot: item.imageUrlSnapshot ? item.imageUrlSnapshot.split('?')[0] : null,
    }))
    const rows = await this.db.insert(orderItems).values(sanitizedInput).returning()
    return rows.map(mapOrderItem)
  }

  async createPaymentIntent(input: typeof paymentIntents.$inferInsert): Promise<PaymentIntentRecord> {
    const [row] = await this.db.insert(paymentIntents).values(input).returning()
    return mapPaymentIntent(row)
  }

  async findOrderById(tenantId: string, orderId: string): Promise<OrderRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)

    if (isUuid) {
      const [row] = await this.db
        .select()
        .from(orders)
        .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
        .limit(1)
      if (row) return mapOrder(row)
    }

    const [rowByNum] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.orderNumber, orderId)))
      .limit(1)
    return rowByNum ? mapOrder(rowByNum) : null
  }

  async findOrderByIdempotencyKey(tenantId: string, key: string): Promise<OrderRecord | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.idempotencyKey, key)))
      .limit(1)
    return row ? mapOrder(row) : null
  }

  async findOrderByToken(tenantId: string, token: string): Promise<OrderRecord | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.orderToken, token)))
      .limit(1)
    return row ? mapOrder(row) : null
  }

  async listOrderItems(tenantId: string, orderId: string): Promise<OrderItemRecord[]> {
    const rows = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, orderId)))
    
    return rows.map(mapOrderItem)
  }

  async findPaymentIntentByOrderId(tenantId: string, orderId: string): Promise<PaymentIntentRecord | null> {
    const [row] = await this.db
      .select()
      .from(paymentIntents)
      .where(and(eq(paymentIntents.tenantId, tenantId), eq(paymentIntents.orderId, orderId)))
      .limit(1)
    return row ? mapPaymentIntent(row) : null
  }

  async updateOrder(
    tenantId: string,
    orderId: string,
    input: Partial<typeof orders.$inferInsert>,
  ): Promise<OrderRecord> {
    const [row] = await this.db
      .update(orders)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
      .returning()
    return mapOrder(row)
  }

  async listCustomerOrders(tenantId: string, customerId: string, filters: OrderFilters = {}): Promise<OrderListItem[]> {
    const rows = await this.db
      .select({
        order: orders,
        itemCount: count(orderItems.id),
      })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.customerId, customerId),
          ...(filters.status ? [eq(orders.status, filters.status)] : []),
        ),
      )
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt))

    return rows.map((row) => ({ ...mapOrder(row.order), itemCount: row.itemCount }))
  }

  async listCustomerOrdersWithDetails(tenantId: string, customerId: string, filters: OrderFilters = {}): Promise<CustomerOrderListItem[]> {
    const rows = await this.db
      .select({
        order: orders,
        itemCount: count(orderItems.id),
      })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.customerId, customerId),
          ...(filters.status ? [eq(orders.status, filters.status)] : []),
        ),
      )
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt))

    if (rows.length === 0) return []

    const orderIds = rows.map((r) => r.order.id)

    const allItems = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, orderIds)))

    const itemsByOrder = new Map<string, OrderItemRecord[]>()
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? []
      list.push(mapOrderItem(item))
      itemsByOrder.set(item.orderId, list)
    }

    return rows.map((row) => ({
      ...mapOrder(row.order),
      itemCount: row.itemCount,
      items: itemsByOrder.get(row.order.id) ?? [],
    }))
  }

  async listAdminOrders(
    tenantId: string,
    filters: OrderFilters = {}
  ): Promise<PaginatedResult<OrderListItemWithDetails>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions = [eq(orders.tenantId, tenantId)]
    if (filters.status) {
      conditions.push(eq(orders.status, filters.status))
    }
    if (filters.partnerId !== undefined) {
      conditions.push(filters.partnerId === null ? isNull(orders.partnerId) : eq(orders.partnerId, filters.partnerId))
    }

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(orders)
        .where(and(...conditions)),
      this.db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(perPage)
        .offset(offset)
    ])

    if (rows.length === 0) {
      return { items: [], page, perPage, total: totalResult[0]?.total ?? 0 }
    }

    const orderIds = rows.map((r) => r.id)

    const allItems = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, orderIds)))

    const itemsByOrder = new Map<string, OrderItemRecord[]>()
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? []
      list.push(mapOrderItem(item))
      itemsByOrder.set(item.orderId, list)
    }

    const items = rows.map((row) => {
      const shippingAddress = parseAddressSnapshot(row.shippingAddressSnapshot)
      const billingAddress = row.billingAddressSnapshot ? parseAddressSnapshot(row.billingAddressSnapshot) : null
      const mappedOrder = mapOrder(row)
      const items = itemsByOrder.get(row.id) ?? []

      const showBilling = billingAddress && JSON.stringify(billingAddress) !== JSON.stringify(shippingAddress)

      return {
        ...mappedOrder,
        billingAddressSnapshot: showBilling ? billingAddress : null,
        itemCount: items.length,
        customerName: `${shippingAddress.fullName || ''}`.trim() || 'Customer',
        customerPhone: shippingAddress.phone || null,
        items,
      }
    })

    return {
      items,
      page,
      perPage,
      total: totalResult[0]?.total ?? 0,
    }
  }

  async listAdminOrdersSummary(
    tenantId: string,
    filters: OrderListItemSummaryFilters = {}
  ): Promise<PaginatedResult<OrderListItemSummary>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const offset = (page - 1) * perPage

    const conditions = [eq(orders.tenantId, tenantId)]
    if (filters.status) {
      if (filters.status === 'automations') {
        conditions.push(sql`${orders.metadata}->>'syncMessage' IS NOT NULL AND ${orders.metadata}->>'syncMessage' != ''`)
      } else if (filters.status === 'local_delivery') {
        conditions.push(sql`(${orders.shippingMethodSnapshot}->>'id' ILIKE '%local%' OR ${orders.shippingAddressSnapshot}->>'city' IS NOT NULL)`)
      } else {
        const statusList = filters.status.split(',') as OrderStatus[]
        if (statusList.length === 1) {
          conditions.push(eq(orders.status, statusList[0]))
        } else if (statusList.length > 1) {
          conditions.push(inArray(orders.status, statusList))
        }
      }
    }
    if (filters.partnerId !== undefined) {
      conditions.push(filters.partnerId === null ? isNull(orders.partnerId) : eq(orders.partnerId, filters.partnerId))
    }
    if (filters.customerId && filters.customerEmail) {
      conditions.push(
        sql`(${orders.customerId} = ${filters.customerId}::uuid OR ${orders.guestEmail} ILIKE ${filters.customerEmail} OR ${orders.shippingAddressSnapshot}->>'email' ILIKE ${filters.customerEmail})`
      )
    } else if (filters.customerId) {
      conditions.push(eq(orders.customerId, filters.customerId))
    } else if (filters.customerEmail) {
      conditions.push(
        sql`(${orders.guestEmail} ILIKE ${filters.customerEmail} OR ${orders.shippingAddressSnapshot}->>'email' ILIKE ${filters.customerEmail} OR ${orders.customerId} IN (SELECT id FROM customers WHERE email ILIKE ${filters.customerEmail}))`
      )
    }
    if (filters.timeFilter && filters.timeFilter !== 'all') {
      const days = filters.timeFilter === 'today' ? 1 : filters.timeFilter === '7days' ? 7 : 30
      conditions.push(sql`${orders.createdAt} >= now() - (${days} || ' day')::interval`)
    }
    if (filters.search) {
      const searchPattern = `%${filters.search.toLowerCase()}%`
      conditions.push(
        sql`(${orders.orderNumber} ILIKE ${searchPattern} 
          OR ${orders.guestEmail} ILIKE ${searchPattern} 
          OR lower(${orders.shippingAddressSnapshot}->>'fullName') LIKE ${searchPattern}
          OR ${orders.id} IN (
            SELECT ${orderItems.orderId} FROM ${orderItems}
            WHERE ${orderItems.tenantId} = ${tenantId}::uuid 
              AND lower(${orderItems.productTitleSnapshot}) LIKE ${searchPattern}
          ))`
      )
    }

    let orderByClause = desc(orders.createdAt)
    if (filters.sortBy) {
      if (filters.sortBy === 'total') {
        orderByClause = filters.sortOrder === 'asc' ? asc(orders.total) : desc(orders.total)
      } else if (filters.sortBy === 'id') {
        orderByClause = filters.sortOrder === 'asc' ? asc(orders.orderNumber) : desc(orders.orderNumber)
      } else if (filters.sortBy === 'date') {
        orderByClause = filters.sortOrder === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt)
      }
    }

    const [totalResult, statsResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(orders)
        .where(and(...conditions)),
      this.db
        .select({
          totalOrders: count(),
          totalRevenuePaise: sql<number>`COALESCE(sum(${orders.total}), 0)::bigint`,
          fulfilledOrders: sql<number>`COALESCE(count(*) FILTER (WHERE ${orders.status} IN ('DELIVERED', 'SHIPPED')), 0)::int`,
          cancelledOrders: sql<number>`COALESCE(count(*) FILTER (WHERE ${orders.status} = 'CANCELLED'), 0)::int`,
          pendingOrders: sql<number>`COALESCE(count(*) FILTER (WHERE ${orders.status} IN ('PENDING', 'CONFIRMED', 'PROCESSING')), 0)::int`,
        })
        .from(orders)
        .where(and(...conditions)),
      this.db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          guestEmail: orders.guestEmail,
          total: orders.total,
          createdAt: orders.createdAt,
          metadata: orders.metadata,
          customerName: sql<string>`COALESCE(${orders.shippingAddressSnapshot}->>'fullName', 'Customer')`,
          customerEmail: sql<string>`COALESCE(${orders.guestEmail}, ${orders.shippingAddressSnapshot}->>'email', 'guest@example.com')`,
          customerCity: sql<string>`COALESCE(${orders.shippingAddressSnapshot}->>'city', 'Unknown')`,
          itemCount: sql<number>`COALESCE((
            SELECT sum(quantity)::int FROM order_items 
            WHERE order_items.order_id = orders.id
          ), 0)`,
        })
        .from(orders)
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(perPage)
        .offset(offset)
    ])

    const items = rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      guestEmail: row.guestEmail,
      total: row.total,
      createdAt: row.createdAt.toISOString(),
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerCity: row.customerCity,
      itemCount: row.itemCount,
      syncMessage: (row.metadata as Record<string, unknown> | undefined)?.syncMessage as string | undefined,
    }))

    const rawStats = statsResult[0] || { totalOrders: 0, totalRevenuePaise: 0, fulfilledOrders: 0, cancelledOrders: 0, pendingOrders: 0 }

    return {
      items,
      page,
      perPage,
      total: totalResult[0]?.total ?? 0,
      stats: {
        totalOrders: Number(rawStats.totalOrders || 0),
        totalRevenue: Number(rawStats.totalRevenuePaise || 0) / 100,
        fulfilledOrders: Number(rawStats.fulfilledOrders || 0),
        cancelledOrders: Number(rawStats.cancelledOrders || 0),
        pendingOrders: Number(rawStats.pendingOrders || 0),
        totalItems: 0,
      },
    } as any
  }

  async getOrderDetail(tenantId: string, orderId: string): Promise<OrderDetail | null> {
    const order = await this.findOrderById(tenantId, orderId)
    if (!order) {
      return null
    }

    const [items, paymentIntent] = await Promise.all([
      this.listOrderItems(tenantId, order.id),
      this.findPaymentIntentByOrderId(tenantId, order.id),
    ])

    let customerRecord: typeof customers.$inferSelect | null = null
    if (order.customerId) {
      const [c] = await this.db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1)
      if (c) customerRecord = c
    }

    return {
      ...order,
      items,
      paymentIntent,
      customerRecord,
    } as any
  }

  async getOrdersByCheckoutGroupId(tenantId: string, checkoutGroupId: string): Promise<OrderDetail[]> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.checkoutGroupId, checkoutGroupId)))
      .orderBy(orders.createdAt)

    if (rows.length === 0) return []

    const orderRecords = rows.map(mapOrder)
    const details = await Promise.all(
      orderRecords.map(async (order) => {
        const [items, paymentIntent] = await Promise.all([
          this.listOrderItems(tenantId, order.id),
          this.findPaymentIntentByOrderId(tenantId, order.id),
        ])
        return { ...order, items, paymentIntent }
      })
    )

    return details
  }
}

import { and, eq } from 'drizzle-orm'

import { AppError } from '../../lib/errors.js'
import { PaginatedResult } from '../../lib/types.js'
import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import { CartRepository } from '../cart/cart.repository.js'
import { carts } from '../cart/cart.schema.js'
import { InventoryRepository } from '../inventory/inventory.repository.js'
import type { InventoryService } from '../inventory/inventory.service.js'
import { AddressRepository, CustomerRepository } from '../customers/customers.repository.js'
import { ShippingService } from '../shipping/shipping.service.js'
import { OrdersRepository } from './orders.repository.js'
import { shippingMethodSnapshotSchema, storedAddressSnapshotSchema } from './orders.validators.js'
import type {
  CreateOrderInput,
  OrderDetail,
  OrderItemRecord,
  OrderListItemWithDetails,
  OrderStatus,
  OrderVariantSnapshot,
  PlaceOrderActor,
  PlaceOrderResult,
  OrderListItemSummary,
  OrderListItemSummaryFilters,
  OrderRecord,
  OrderLifecycleHooks,
} from './orders.types.js'
import { toAddressSnapshot } from './orders.types.js'
import { IdempotencyStore } from '../../lib/idempotency.js'
import type { DeliveryService } from '../delivery/delivery.service.js'

const CUSTOMER_CANCELLABLE = new Set<OrderStatus>(['PENDING'])
const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly cartRepository: CartRepository,
    private readonly addressRepository: AddressRepository,
    private readonly shippingService: ShippingService,
    private readonly events?: EventPublisher,
    private readonly hooks?: OrderLifecycleHooks,
    private readonly idempotency?: IdempotencyStore,
    private readonly deliveryService?: DeliveryService,
    private readonly inventoryService?: InventoryService,
  ) {}

  async placeOrderForOwner(
    tenant: TenantContext,
    owner: { customerId: string } | { guestSessionId: string },
    input: CreateOrderInput,
    actor?: PlaceOrderActor,
    idempotencyKey?: string,
  ): Promise<PlaceOrderResult> {
    if (idempotencyKey) {
      const existing = await this.repository.findOrderByIdempotencyKey(tenant.tenantId, idempotencyKey)
      if (existing) {
        const detail = await this.repository.getOrderDetail(tenant.tenantId, existing.id)
        if (detail && detail.paymentIntent) {
          return { order: existing, items: detail.items, paymentIntent: detail.paymentIntent }
        }
      }
    }

    if (input.items && input.items.length > 0) {
      return this.placeOrder(tenant, input.items, input, actor, idempotencyKey)
    }

    const cart = await this.cartRepository.findActiveCartByOwner(tenant.tenantId, owner)
    if (!cart) {
      throw new AppError('Cart not found', 404, 'cart-not-found')
    }

    return this.placeOrder(tenant, cart.id, input, actor, idempotencyKey)
  }

  async placeOrder(
    tenant: TenantContext,
    cartIdOrItems: string | CreateOrderInput['items'],
    input: CreateOrderInput,
    actor?: PlaceOrderActor,
    idempotencyKey?: string,
  ): Promise<PlaceOrderResult> {
    const isDirect = Array.isArray(cartIdOrItems)

    return this.repository.transaction(async (repository) => {
      if (idempotencyKey) {
        const existing = await repository.findOrderByIdempotencyKey(tenant.tenantId, idempotencyKey)
        if (existing) {
          const detail = await repository.getOrderDetail(tenant.tenantId, existing.id)
          if (detail && detail.paymentIntent) {
            return { order: existing, items: detail.items, paymentIntent: detail.paymentIntent }
          }
        }
      }

      let cartId: string | undefined
      let cartItems: Array<{
        variantId: string
        quantity: number
        partnerId: string | null
        metadata: Record<string, unknown>
      }> = []
      let cartDiscount = 0
      let cartCoupon: string | null = null
      let cartLoyaltyPoints = 0
      let selectedShippingOptionId: string | undefined

      if (isDirect) {
        cartItems = cartIdOrItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          partnerId: null,
          metadata: item.metadata ?? {},
        }))
      } else {
        cartId = cartIdOrItems as string
        await repository.lockCart(tenant.tenantId, cartId)
        const cart = await repository.findCartById(tenant.tenantId, cartId)
        if (!cart) throw new AppError('Cart not found', 404, 'cart-not-found')
        if (cart.status !== 'active')
          throw new AppError('Cart is not active', 409, 'cart-not-active')

        const items = await repository.listCartItems(tenant.tenantId, cartId)
        if (items.length === 0) throw new AppError('Cart is empty', 400, 'cart-empty')

        cartItems = items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          partnerId: i.partnerId,
          metadata: i.metadata as Record<string, unknown>,
        }))
        cartDiscount = cart.discountAmount
        cartCoupon = cart.couponCode
        cartLoyaltyPoints = cart.loyaltyPoints
        selectedShippingOptionId = cart.selectedShippingOptionId ?? undefined
      }

      // Sort variant IDs to ensure deterministic lock acquisition order (prevents DB deadlocks)
      const sortedVariantIds = Array.from(new Set(cartItems.map((item) => item.variantId))).sort()
      const snapshots = await repository.getVariantSnapshots(tenant.tenantId, sortedVariantIds)
      const snapshotMap = new Map(snapshots.map((s) => [s.variantId, s]))
      const inventoryRepository = new InventoryRepository(repository.getDb())

      if (isDirect) {
        for (const item of cartItems) {
          const s = snapshotMap.get(item.variantId)
          if (s) item.partnerId = s.partnerId
        }
      }

      // 1. Validation & Inventory Checks (sorted to prevent deadlocks)
      for (const variantId of sortedVariantIds) {
        const snapshot = snapshotMap.get(variantId)
        this.assertPurchasable(snapshot)

        const variantItems = cartItems.filter((i) => i.variantId === variantId)
        const totalRequestedQuantity = variantItems.reduce((sum, i) => sum + i.quantity, 0)

        if (snapshot.trackInventory) {
          const stock = await inventoryRepository.findByVariantIdForUpdate(
            tenant.tenantId,
            snapshot.variantId,
          )
          if (!stock)
            throw new AppError(
              'Tracked variant inventory row missing',
              500,
              'inventory-row-missing',
            )

          const stockHeldOrAvailable = stock.quantityReserved + stock.quantityAvailable
          if (!stock.allowBackorder && stockHeldOrAvailable < totalRequestedQuantity) {
            throw new AppError('Insufficient stock', 409, 'insufficient-stock')
          }
        }
      }

      // 2. Shipping Calculation
      const shippingOption = this.shippingService.selectOption(
        await this.shippingService.calculate({
          items: this.shippingService.toPricingItems(
            cartItems.map((item) => {
              const snapshot = snapshotMap.get(item.variantId)!
              return {
                variantId: item.variantId,
                partnerId: item.partnerId || snapshot.partnerId,
                quantity: item.quantity,
                unitPrice: snapshot.price,
                productType: snapshot.productType,
                weightGrams: snapshot.weightGrams,
              }
            }),
          ),
          tenant,
          subtotal: await cartItems.reduce(
            async (sumPromise, item) => {
              const sum = await sumPromise
              const s = snapshotMap.get(item.variantId)!
              return sum + s.price * item.quantity
            },
            Promise.resolve(0),
          ),
          address: null,
        }),
        input.selectedShippingOptionId ?? selectedShippingOptionId,
      )

      const shippingAddressSnapshot = await this.resolveShippingAddressSnapshot(
        tenant.tenantId,
        actor?.customerId,
        input,
      )
      const billingAddressSnapshot = await this.resolveBillingAddressSnapshot(
        tenant.tenantId,
        actor?.customerId,
        input,
        shippingAddressSnapshot,
      )

      // 3. Multi-Vendor Pincode Check
      if (tenant.mode === 'MULTI_VENDOR' && this.hooks?.checkServiceability && shippingAddressSnapshot.postalCode) {
        const isServiceable = await this.hooks.checkServiceability(
          tenant.tenantId,
          Array.from(new Set(cartItems.map((i) => i.partnerId || snapshotMap.get(i.variantId)?.partnerId).filter(Boolean) as string[])),
          shippingAddressSnapshot.postalCode,
        )
        if (!isServiceable) {
          throw new AppError('One or more vendors do not deliver to this pincode', 400, 'pincode-unserviceable')
        }
      }

      // 4. Group items by partnerId and create Vendor-Scoped Orders
      const itemsByVendor = new Map<string, typeof cartItems>()
      for (const item of cartItems) {
        const snapshot = snapshotMap.get(item.variantId)!
        const vId = item.partnerId || snapshot.partnerId
        if (!vId) {
          throw new AppError('Vendor ID missing for item', 400, 'vendor-id-missing')
        }
        const group = itemsByVendor.get(vId) ?? []
        group.push({ ...item, partnerId: vId })
        itemsByVendor.set(vId, group)
      }

      const checkoutGroupId = crypto.randomUUID()
      const createdOrders: OrderRecord[] = []
      const allCreatedItems: OrderItemRecord[] = []
      const shippingAmount = shippingOption?.amount ?? 0

      // Calculate totals per vendor
      const vendorSubtotals = new Map<string, number>()
      let grandSubtotal = 0

      for (const [vId, vItems] of itemsByVendor.entries()) {
        let vSubtotal = 0
        for (const item of vItems) {
          const snapshot = snapshotMap.get(item.variantId)!
          vSubtotal += snapshot.price * item.quantity
        }
        vendorSubtotals.set(vId, vSubtotal)
        grandSubtotal += vSubtotal
      }

      const vendorEntries = Array.from(itemsByVendor.entries())
      let remainingDiscount = cartDiscount
      let remainingShipping = shippingAmount

      for (let idx = 0; idx < vendorEntries.length; idx++) {
        const [vId, vItems] = vendorEntries[idx]
        const isLast = idx === vendorEntries.length - 1
        const vSubtotal = vendorSubtotals.get(vId) ?? 0

        const vDiscount = isLast
          ? remainingDiscount
          : (grandSubtotal > 0 ? Math.round((vSubtotal / grandSubtotal) * cartDiscount) : 0)
        remainingDiscount -= vDiscount

        const vShipping = isLast
          ? remainingShipping
          : (vendorEntries.length === 1 ? shippingAmount : Math.round(shippingAmount / vendorEntries.length))
        remainingShipping -= vShipping

        const vTotal = Math.max(vSubtotal + vShipping - vDiscount, 0)

        let resolvedCustomerId: string | null = actor?.customerId ?? null
        if (!resolvedCustomerId) {
          const customerRepo = new CustomerRepository(repository.getDb())
          const guestEmail = input.guestEmail?.toLowerCase().trim()
          let existingCust = guestEmail ? await customerRepo.findByEmail(tenant.tenantId, guestEmail) : null
          if (!existingCust && shippingAddressSnapshot?.phone) {
            const phone = String(shippingAddressSnapshot.phone).trim().replace(/\D/g, '')
            if (phone) existingCust = await customerRepo.findByPhone(tenant.tenantId, phone)
          }
          if (existingCust) {
            resolvedCustomerId = existingCust.id
          }
        }

        const order = await repository.createOrder({
          tenantId: tenant.tenantId,
          partnerId: vId,
          checkoutGroupId,
          customerId: resolvedCustomerId,
          orderNumber: await repository.nextOrderNumber(tenant.tenantId),
          status: 'PENDING',
          payoutStatus: 'PENDING',
          guestEmail: actor ? null : this.requireGuestEmail(input.guestEmail),
          shippingAddressSnapshot: storedAddressSnapshotSchema.parse(shippingAddressSnapshot),
          billingAddressSnapshot: storedAddressSnapshotSchema.parse(billingAddressSnapshot),
          shippingMethodSnapshot: shippingMethodSnapshotSchema.parse(shippingOption ?? null),
          subtotal: vSubtotal,
          discountAmount: vDiscount,
          shippingAmount: vShipping,
          taxAmount: 0,
          total: vTotal,
          couponCodeSnapshot: cartCoupon,
          loyaltyPointsRedeemed: cartLoyaltyPoints,
          notes: input.notes ?? null,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:${vId}` : null,
          metadata: {
            ...(input.metadata ?? {}),
            currency: tenant.config.currency,
          },
        })

        createdOrders.push(order)

        const vCreatedItems = await repository.createOrderItems(
          vItems.map((item) => {
            const snapshot = snapshotMap.get(item.variantId)!
            const unitPrice = snapshot.price
            return {
              tenantId: tenant.tenantId,
              orderId: order.id,
              productId: snapshot.productId,
              variantId: snapshot.variantId,
              partnerId: vId,
              productTitleSnapshot: snapshot.productTitle,
              variantTitleSnapshot: snapshot.variantTitle,
              skuSnapshot: snapshot.sku,
              unitPriceSnapshot: unitPrice,
              quantity: item.quantity,
              lineTotal: unitPrice * item.quantity,
              imageUrlSnapshot: snapshot.imageUrl,
              metadata: item.metadata,
            }
          }),
        )

        allCreatedItems.push(...vCreatedItems)

        // 5. Update Inventory per Vendor Order
        for (const item of vItems) {
          const snapshot = snapshotMap.get(item.variantId)!

          // Standard Item
          if (!snapshot.trackInventory) continue

          const stock = await inventoryRepository.findByVariantIdForUpdate(tenant.tenantId, snapshot.variantId)
          if (!stock) throw new AppError('Tracked variant inventory row missing', 500, 'inventory-row-missing')

          const reservedToConsume = Math.min(stock.quantityReserved, item.quantity)
          await inventoryRepository.updateStock(tenant.tenantId, stock.id, {
            quantityReserved: stock.quantityReserved - reservedToConsume,
            quantityAvailable: stock.quantityAvailable - Math.max(item.quantity - reservedToConsume, 0),
            quantitySold: stock.quantitySold + item.quantity,
          })
          await inventoryRepository.insertHistory({
            tenantId: tenant.tenantId,
            variantId: snapshot.variantId,
            partnerId: snapshot.partnerId,
            delta: -item.quantity,
            reason: 'sold',
            orderId: order.id,
            cartId: cartId ?? undefined,
          })
        }
      }

      const totalCheckoutAmount = createdOrders.reduce((sum, o) => sum + o.total, 0)
      const primaryOrder = createdOrders[0]

      const paymentIntent = await repository.createPaymentIntent({
        tenantId: tenant.tenantId,
        orderId: primaryOrder.id,
        status: 'PENDING',
        amount: totalCheckoutAmount,
        currency: tenant.config.currency,
        provider: tenant.payment.provider,
        metadata: {
          checkoutGroupId,
          orderNumber: primaryOrder.orderNumber,
          orderIds: createdOrders.map((o) => o.id),
        },
      })

      if (cartId) {
        await repository
          .getDb()
          .update(carts)
          .set({ status: 'converted', updatedAt: new Date() })
          .where(and(eq(carts.tenantId, tenant.tenantId), eq(carts.id, cartId)))
      }

      for (const order of createdOrders) {
        const vendorItems = allCreatedItems.filter((i) => i.orderId === order.id)
        await this.events?.publish('order.created', {
          orderId: order.id,
          tenantId: tenant.tenantId,
          items: vendorItems.map((item) => ({
            orderItemId: item.id,
            variantId: item.variantId,
            partnerId: item.partnerId,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
        })

        if (tenant.mode === 'MULTI_VENDOR' && this.hooks?.onOrderCreated) {
          await this.hooks.onOrderCreated(order.id, tenant.tenantId)
        }
      }

      return { order: primaryOrder, orders: createdOrders, items: allCreatedItems, paymentIntent }
    })
  }

  async listMyOrders(tenantId: string, customerId: string, status?: OrderStatus): Promise<import('./orders.types.js').CustomerOrderListItem[]> {
    return this.repository.listCustomerOrdersWithDetails(tenantId, customerId, { status })
  }

  async getMyOrder(tenantId: string, customerId: string, orderId: string): Promise<OrderDetail> {
    const detail = await this.repository.getOrderDetail(tenantId, orderId)
    if (!detail || detail.customerId !== customerId) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }
    return detail
  }

  async trackGuestOrder(tenantId: string, token: string): Promise<OrderDetail> {
    const order = await this.repository.findOrderByToken(tenantId, token)
    if (!order) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }

    const detail = await this.repository.getOrderDetail(tenantId, order.id)
    if (!detail) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }
    return detail
  }

  async cancelOrder(tenantId: string, orderId: string, actor: PlaceOrderActor, isAdmin = false): Promise<OrderDetail> {
    const order = await this.repository.getOrderDetail(tenantId, orderId)
    if (!order || (!isAdmin && order.customerId !== actor.customerId)) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }

    if (!isAdmin && !CUSTOMER_CANCELLABLE.has(order.status)) {
      throw new AppError('Order cannot be cancelled', 409, 'invalid-order-status')
    }
    if (isAdmin && !ADMIN_TRANSITIONS[order.status].includes('CANCELLED')) {
      throw new AppError('Order cannot be cancelled', 409, 'invalid-order-status')
    }

    return this.cancelAndRestoreInventory(tenantId, order)
  }

  async updateStatus(
    tenantId: string,
    orderId: string,
    status: OrderStatus,
    actor?: { isAdmin?: boolean; isSuperAdmin?: boolean; activePartnerId?: string | null },
    trackingDetails?: { trackingNumber?: string | null; trackingUrl?: string | null },
  ): Promise<OrderDetail> {
    const order = await this.repository.getOrderDetail(tenantId, orderId)
    if (!order) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }

    if (actor && !actor.isAdmin && !actor.isSuperAdmin) {
      if (!actor.activePartnerId || order.partnerId !== actor.activePartnerId) {
        throw new AppError('Order not found', 404, 'order-not-found')
      }
    }

    if (!ADMIN_TRANSITIONS[order.status].includes(status)) {
      throw new AppError('Invalid order status transition', 409, 'invalid-order-status-transition')
    }

    const updatePayload: Record<string, unknown> = { status }
    if (trackingDetails?.trackingNumber !== undefined) updatePayload.trackingNumber = trackingDetails.trackingNumber
    if (trackingDetails?.trackingUrl !== undefined) updatePayload.trackingUrl = trackingDetails.trackingUrl

    await this.repository.updateOrder(tenantId, orderId, updatePayload)

    if (status === 'PROCESSING' && this.deliveryService) {
      const config = await this.deliveryService.getActiveConfig(tenantId, order.partnerId)
      if (config && config.provider !== 'manual') {
        try {
          await this.deliveryService.bookShipment(tenantId, orderId)
        } catch (err) {
          console.error(`[Fulfillment Auto-booking Failed for Order ${orderId}]:`, err)
          throw new AppError(
            `Fulfillment failed: Courier shipment booking error: ${err instanceof Error ? err.message : String(err)}`,
            400,
            'shipment-booking-failed',
          )
        }
      }
    }

    if (status === 'CANCELLED' && this.inventoryService) {
      for (const item of order.items) {
        if (item.variantId && item.quantity > 0) {
          try {
            await this.inventoryService.restoreOnCancellation(item.variantId, item.quantity, orderId, tenantId)
          } catch (err) {
            console.error(`[Inventory Restore on Cancel Failed for Item ${item.id}]:`, err)
          }
        }
      }
    }

    const updated = await this.repository.getOrderDetail(tenantId, orderId)
    if (!updated) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }
    return updated
  }

  async getOrdersByCheckoutGroupId(
    tenantId: string,
    checkoutGroupId: string,
    owner?: { customerId?: string },
  ): Promise<OrderDetail[]> {
    const list = await this.repository.getOrdersByCheckoutGroupId(tenantId, checkoutGroupId)
    if (list.length === 0) {
      throw new AppError('Orders not found for checkout group', 404, 'order-not-found')
    }

    if (owner?.customerId) {
      const isOwner = list.every((ord) => ord.customerId === owner.customerId)
      if (!isOwner) {
        throw new AppError('Forbidden access to checkout group', 403, 'forbidden')
      }
    }

    return list
  }

  async listAdminOrders(
    tenantId: string,
    status?: OrderStatus,
    actor?: { isAdmin?: boolean; isSuperAdmin?: boolean; activePartnerId?: string | null },
    partnerId?: string | null,
    page = 1,
    perPage = 20,
  ): Promise<PaginatedResult<OrderListItemWithDetails>> {
    const finalVendorId = partnerId !== undefined 
      ? partnerId 
      : (actor && !actor.isAdmin && !actor.isSuperAdmin && actor.activePartnerId ? actor.activePartnerId : undefined)
    
    return this.repository.listAdminOrders(tenantId, { 
      status, 
      partnerId: finalVendorId,
      page,
      perPage 
    })
  }

  async listAdminOrdersSummary(
    tenantId: string,
    filters: OrderListItemSummaryFilters,
    actor?: { isAdmin?: boolean; isSuperAdmin?: boolean; activePartnerId?: string | null }
  ): Promise<PaginatedResult<OrderListItemSummary>> {
    const finalVendorId = filters.partnerId !== undefined
      ? filters.partnerId
      : (actor && !actor.isAdmin && !actor.isSuperAdmin && actor.activePartnerId ? actor.activePartnerId : undefined)

    return this.repository.listAdminOrdersSummary(tenantId, {
      ...filters,
      partnerId: finalVendorId
    })
  }

  async getAdminOrderDetail(
    tenantId: string,
    orderId: string,
    actor?: { isAdmin?: boolean; isSuperAdmin?: boolean; activePartnerId?: string | null }
  ): Promise<OrderDetail | null> {
    const detail = await this.repository.getOrderDetail(tenantId, orderId)
    if (!detail) return null

    if (actor && !actor.isAdmin && !actor.isSuperAdmin && actor.activePartnerId) {
      if (detail.partnerId !== actor.activePartnerId) {
        return null
      }
    }
    return detail
  }

  private async cancelAndRestoreInventory(tenantId: string, order: OrderDetail): Promise<OrderDetail> {
    return this.repository.transaction(async (repository) => {
      const inventoryRepository = new InventoryRepository(repository.getDb())
      for (const item of order.items) {

        const snapshot = await repository.getVariantSnapshots(tenantId, [item.variantId])
        const variant = snapshot[0]
        if (!variant?.trackInventory) {
          continue
        }

        const stock = await inventoryRepository.findByVariantIdForUpdate(tenantId, item.variantId)
        if (!stock) {
          throw new AppError('Tracked variant inventory row missing', 500, 'inventory-row-missing')
        }

        await inventoryRepository.updateStock(tenantId, stock.id, {
          quantityAvailable: stock.quantityAvailable + item.quantity,
          quantitySold: Math.max(stock.quantitySold - item.quantity, 0),
        })
        await inventoryRepository.insertHistory({
          tenantId,
          variantId: item.variantId,
          partnerId: item.partnerId || order.partnerId,
          delta: item.quantity,
          reason: 'restored',
          orderId: order.id,
        })
      }

      await repository.updateOrder(tenantId, order.id, { status: 'CANCELLED' })
      const updated = await repository.getOrderDetail(tenantId, order.id)
      if (!updated) {
        throw new AppError('Order not found', 404, 'order-not-found')
      }
      return updated
    })
  }

  private assertPurchasable(snapshot: OrderVariantSnapshot | undefined): asserts snapshot is OrderVariantSnapshot {
    if (!snapshot || snapshot.isDeleted || snapshot.productStatus !== 'active') {
      throw new AppError('Variant is unavailable', 409, 'cart-item-unavailable')
    }
    
    if (snapshot.partnerId && snapshot.approvalStatus !== 'APPROVED') {
      throw new AppError(
        snapshot.approvalStatus === 'REJECTED'
          ? 'Product has been rejected by the platform'
          : 'Product is awaiting moderation',
        409,
        'product-not-approved',
      )
    }
  }

  private async resolveShippingAddressSnapshot(
    tenantId: string,
    customerId: string | undefined,
    input: CreateOrderInput,
  ) {
    if (customerId && input.shippingAddressId) {
      const address = await this.addressRepository.findById(tenantId, input.shippingAddressId, customerId)
      if (!address) {
        throw new AppError('Shipping address not found', 404, 'address-not-found')
      }
      return toAddressSnapshot(address)
    }

    if (input.shippingAddress) {
      return storedAddressSnapshotSchema.parse(input.shippingAddress)
    }

    throw new AppError('Shipping address is required', 400, 'shipping-address-required')
  }

  private async resolveBillingAddressSnapshot(
    tenantId: string,
    customerId: string | undefined,
    input: CreateOrderInput,
    shippingAddress: Awaited<ReturnType<OrdersService['resolveShippingAddressSnapshot']>>,
  ) {
    if (customerId && input.billingAddressId) {
      const address = await this.addressRepository.findById(tenantId, input.billingAddressId, customerId)
      if (!address) {
        throw new AppError('Billing address not found', 404, 'address-not-found')
      }
      return toAddressSnapshot(address)
    }

    return input.billingAddress ? storedAddressSnapshotSchema.parse(input.billingAddress) : shippingAddress
  }

  private requireGuestEmail(guestEmail: string | undefined): string {
    if (!guestEmail) {
      throw new AppError('Guest email is required', 400, 'guest-email-required')
    }
    return guestEmail
  }
}

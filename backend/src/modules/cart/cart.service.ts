import { AppError } from '../../lib/errors.js'
import { logger } from '../../lib/logger.js'
import { cartKey } from '../../lib/redis-keys.js'
import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import type { CacheProvider } from '../../providers/cache/cache.interface.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import { InventoryRepository } from '../inventory/inventory.repository.js'
import type { InventoryRecord } from '../inventory/inventory.types.js'
import type { InventoryService } from '../inventory/inventory.service.js'
import type { ShippingService } from '../shipping/shipping.service.js'
import { CartRepository } from './cart.repository.js'
import { createCartExpiryJob, type CartExpiryJobPayload, type CartExpiryJobScheduler } from './cart.jobs.js'
import { GuestSessionRepository } from '../customers/customers.repository.js'
import type {
  AddCartItemInput,
  CartCheckoutResult,
  CartItemRecord,
  CartLineView,
  CartOwner,
  CartPriceNotice,
  CartRecord,
  CartView,
  CheckoutInput,
  CreateCartInput,
} from './cart.types.js'

const CART_CACHE_TTL_SECONDS = 60 * 15
const MAX_CART_ITEMS = 50

export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly inventoryService: InventoryService,
    private readonly shippingService: ShippingService,
    private readonly cache?: CacheProvider,
    private readonly expiryScheduler?: CartExpiryJobScheduler,
    private readonly events?: EventPublisher,
    private readonly tenantResolver?: (tenantId: string) => Promise<TenantContext>,
  ) {}

  async getCurrentCart(tenant: TenantContext, owner: CartOwner): Promise<CartView> {
    const cart = await this.getExistingCart(tenant.tenantId, owner)
    if (!cart) {
      throw new AppError('Cart not found', 404, 'cart-not-found')
    }

    if (cart.status === 'expired') {
      throw new AppError('Cart expired', 409, 'cart-expired')
    }

    return this.getHydratedCart(tenant, cart)
  }

  async addItem(tenant: TenantContext, owner: CartOwner, input: AddCartItemInput): Promise<CartView> {
    const snapshot = await this.requireActiveVariant(tenant.tenantId, input.variantId)
    const cart = await this.repository.transaction(async (repository) => {
      let currentCart = await this.findOrCreateCartInTransaction(repository, tenant.tenantId, owner)
      const existing = await repository.findCartItemByVariant(tenant.tenantId, currentCart.id, input.variantId)

      if (!existing) {
        const currentItems = await repository.listCartItems(tenant.tenantId, currentCart.id)
        if (currentItems.length >= MAX_CART_ITEMS) {
          throw new AppError(`Cart cannot have more than ${MAX_CART_ITEMS} items`, 400, 'cart-items-limit')
        }
      }

      const inventoryRepository = new InventoryRepository(repository.getDb())

      if (snapshot.trackInventory) {
        await this.reserveInventoryInTransaction(
          inventoryRepository,
          snapshot.variantId,
          input.quantity,
          currentCart.id,
          tenant.tenantId,
        )
      }

      if (existing) {
        await repository.updateCartItem(tenant.tenantId, existing.id, {
          quantity: existing.quantity + input.quantity,
          lineTotal: (existing.quantity + input.quantity) * existing.unitPrice,
          metadata: input.metadata ?? existing.metadata,
        })
      } else {
        await repository.createCartItem(tenant.tenantId, currentCart.id, {
          ...input,
          partnerId: snapshot.partnerId,
          productType: snapshot.productType,
          productTitleSnapshot: snapshot.productTitle,
          unitPrice: snapshot.price,
        })
      }

      currentCart = await this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
      return currentCart
    })

    await this.afterCartMutation(tenant.tenantId, cart.id)
    await this.events?.publish('cart.updated', { tenantId: tenant.tenantId, cartId: cart.id, reason: 'add_item' })
    return this.getHydratedCart(tenant, cart)
  }

  async syncItems(tenantId: string, owner: CartOwner, items: AddCartItemInput[]): Promise<void> {
    if (items.length === 0) return
    const tenant = await this.requireTenantContext(tenantId)

    const cartId = await this.repository.transaction(async (repository) => {
      const cart = await this.findOrCreateCartInTransaction(repository, tenantId, owner)
      const variantIds = items.map((i) => i.variantId)
      const snapshots = await repository.getVariantSnapshots(tenantId, variantIds)
      const snapshotsMap = new Map(snapshots.map((s) => [s.variantId, s]))
      const inventoryRepository = new InventoryRepository(repository.getDb())

      for (const item of items) {
        const snapshot = snapshotsMap.get(item.variantId)
        if (!snapshot || snapshot.isDeleted || snapshot.productStatus !== 'active') continue

        const existing = await repository.findCartItemByVariant(tenantId, cart.id, item.variantId)

        if (snapshot.trackInventory) {
          const delta = existing ? item.quantity - existing.quantity : item.quantity
          if (delta > 0) {
            await this.reserveInventoryInTransaction(
              inventoryRepository,
              snapshot.variantId,
              delta,
              cart.id,
              tenantId,
            )
          } else if (delta < 0) {
            await this.releaseInventoryInTransaction(
              inventoryRepository,
              snapshot.variantId,
              Math.abs(delta),
              cart.id,
              tenantId,
            )
          }
        }

        const unitPrice = snapshot.price

        if (existing) {
          await repository.updateCartItem(tenantId, existing.id, {
            quantity: item.quantity,
            unitPrice,
            lineTotal: item.quantity * unitPrice,
            metadata: item.metadata ?? existing.metadata,
          })
        } else {
          await repository.createCartItem(tenantId, cart.id, {
            ...item,
            partnerId: snapshot.partnerId,
            productType: snapshot.productType,
            productTitleSnapshot: snapshot.productTitle,
            unitPrice,
          })
        }
      }

      await this.refreshCartTotalsInTransaction(repository, tenant, cart.id)
      return cart.id
    })

    await this.afterCartMutation(tenantId, cartId)
    await this.events?.publish('cart.updated', { tenantId, cartId, reason: 'sync_items' })
  }

  async updateItem(
    tenant: TenantContext,
    owner: CartOwner,
    itemId: string,
    quantity: number,
  ): Promise<CartView> {
    if (quantity === 0) {
      return this.removeItem(tenant, owner, itemId)
    }

    const cart = await this.repository.transaction(async (repository) => {
      const currentCart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      const item = await this.requireCartItem(repository, tenant.tenantId, currentCart.id, itemId)
      const delta = quantity - item.quantity
      const snapshot = await this.requireActiveVariant(tenant.tenantId, item.variantId)
      const inventoryRepository = new InventoryRepository(repository.getDb())

      if (snapshot.trackInventory && delta !== 0) {
        if (delta > 0) {
          await this.reserveInventoryInTransaction(
            inventoryRepository,
            item.variantId,
            delta,
            currentCart.id,
            tenant.tenantId,
          )
        } else {
          await this.releaseInventoryInTransaction(
            inventoryRepository,
            item.variantId,
            Math.abs(delta),
            currentCart.id,
            tenant.tenantId,
          )
        }
      }

      await repository.updateCartItem(tenant.tenantId, item.id, {
        quantity,
        lineTotal: quantity * item.unitPrice,
      })

      return this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
    })

    await this.afterCartMutation(tenant.tenantId, cart.id)
    await this.events?.publish('cart.updated', { tenantId: tenant.tenantId, cartId: cart.id, reason: 'update_item' })
    return this.getHydratedCart(tenant, cart)
  }

  async removeItem(tenant: TenantContext, owner: CartOwner, itemId: string): Promise<CartView> {
    const cart = await this.repository.transaction(async (repository) => {
      const currentCart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      const item = await this.requireCartItem(repository, tenant.tenantId, currentCart.id, itemId)
      const snapshot = await this.requireVariantSnapshot(tenant.tenantId, item.variantId)
      const inventoryRepository = new InventoryRepository(repository.getDb())

      if (snapshot.trackInventory) {
        await this.releaseInventoryInTransaction(
          inventoryRepository,
          item.variantId,
          item.quantity,
          currentCart.id,
          tenant.tenantId,
        )
      }

      await repository.deleteCartItem(tenant.tenantId, item.id)
      return this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
    })

    await this.afterCartMutation(tenant.tenantId, cart.id)
    await this.events?.publish('cart.updated', { tenantId: tenant.tenantId, cartId: cart.id, reason: 'remove_item' })
    return this.getHydratedCart(tenant, cart)
  }

  async applyCoupon(tenant: TenantContext, owner: CartOwner, code: string): Promise<CartView> {
    const cart = await this.repository.transaction(async (repository) => {
      const currentCart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      if (!tenant.config.coupon_loyalty_stacking && currentCart.loyaltyPoints > 0) {
        throw new AppError('Coupon and loyalty points cannot be stacked', 400, 'cart-stacking-disabled')
      }
      await repository.updateCart(tenant.tenantId, currentCart.id, {
        couponCode: code,
        discountAmount: 0,
        // Only clear loyalty when stacking is disabled (stacking guard already threw above)
        ...(!tenant.config.coupon_loyalty_stacking ? { loyaltyPoints: 0 } : {}),
      })
      return this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
    })
    await this.afterCartMutation(tenant.tenantId, cart.id)
    return this.getHydratedCart(tenant, cart)
  }

  async removeCoupon(tenant: TenantContext, owner: CartOwner): Promise<CartView> {
    const cart = await this.repository.transaction(async (repository) => {
      const currentCart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      await repository.updateCart(tenant.tenantId, currentCart.id, { couponCode: null, discountAmount: 0 })
      return this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
    })
    await this.afterCartMutation(tenant.tenantId, cart.id)
    return this.getHydratedCart(tenant, cart)
  }

  async applyLoyalty(tenant: TenantContext, owner: CartOwner, points: number): Promise<CartView> {
    const cart = await this.repository.transaction(async (repository) => {
      const currentCart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      if (!tenant.config.coupon_loyalty_stacking && currentCart.couponCode) {
        throw new AppError('Coupon and loyalty points cannot be stacked', 400, 'cart-stacking-disabled')
      }
      await repository.updateCart(tenant.tenantId, currentCart.id, {
        loyaltyPoints: points,
        discountAmount: 0,
        // Only clear coupon when stacking is disabled (stacking guard already threw above)
        ...(!tenant.config.coupon_loyalty_stacking ? { couponCode: null } : {}),
      })
      return this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
    })
    await this.afterCartMutation(tenant.tenantId, cart.id)
    return this.getHydratedCart(tenant, cart)
  }

  async removeLoyalty(tenant: TenantContext, owner: CartOwner): Promise<CartView> {
    const cart = await this.repository.transaction(async (repository) => {
      const currentCart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      await repository.updateCart(tenant.tenantId, currentCart.id, { loyaltyPoints: 0, discountAmount: 0 })
      return this.refreshCartTotalsInTransaction(repository, tenant, currentCart.id)
    })
    await this.afterCartMutation(tenant.tenantId, cart.id)
    return this.getHydratedCart(tenant, cart)
  }

  async checkout(tenant: TenantContext, owner: CartOwner, input: CheckoutInput = {}): Promise<CartCheckoutResult> {
    const result = await this.repository.transaction(async (repository) => {
      const cart = await this.requireOwnedCartInTransaction(repository, tenant.tenantId, owner)
      const items = await repository.listCartItems(tenant.tenantId, cart.id)
      if (items.length === 0) {
        throw new AppError('Cart is empty', 400, 'cart-empty')
      }

      const snapshots = await this.snapshotMap(tenant.tenantId, items.map((item) => item.variantId))
      const notices: CartPriceNotice[] = []
      const inventoryRepository = new InventoryRepository(repository.getDb())

      for (const item of items) {
        const snapshot = snapshots.get(item.variantId)
        if (!snapshot || snapshot.isDeleted || snapshot.productStatus !== 'active') {
          throw new AppError('Variant is unavailable', 409, 'cart-item-unavailable')
        }

        if (snapshot.trackInventory) {
          const stock = await this.requireLockedInventory(inventoryRepository, tenant.tenantId, snapshot.variantId)
          this.assertCheckoutStockAvailable(stock, item.quantity)
        }

        if (item.unitPrice !== snapshot.price) {
          notices.push({
            type: 'price_changed',
            itemId: item.id,
            variantId: item.variantId,
            oldUnitPrice: item.unitPrice,
            newUnitPrice: snapshot.price,
          })
          // Auto-correct stale price so the checkout total is accurate
          await repository.updateCartItem(tenant.tenantId, item.id, {
            unitPrice: snapshot.price,
            lineTotal: item.quantity * snapshot.price,
          })
        }
      }

      if (input.selectedShippingOptionId) {
        await repository.updateCart(tenant.tenantId, cart.id, { selectedShippingOptionId: input.selectedShippingOptionId })
      }

      const nextCart = await this.refreshCartTotalsInTransaction(repository, tenant, cart.id)
      return { cart: nextCart, notices }
    })

    await this.afterCartMutation(tenant.tenantId, result.cart.id)
    return { cart: await this.getHydratedCart(tenant, result.cart), notices: result.notices }
  }

  async mergeGuestCartIntoCustomer(request: { tenantId: string; guestSessionId: string; customerId: string }): Promise<void> {
    const guestCart = await this.getExistingCart(request.tenantId, { guestSessionId: request.guestSessionId })
    if (!guestCart || guestCart.status !== 'active') {
      return
    }

    const customerCart = await this.getExistingCart(request.tenantId, { customerId: request.customerId })

    const mergedCartId = await this.repository.transaction(async (repository) => {
      const source = await repository.lockCart(request.tenantId, guestCart.id)
      if (!source || source.status !== 'active') {
        return customerCart?.id ?? null
      }

      const target =
        customerCart && customerCart.status === 'active'
          ? await repository.lockCart(request.tenantId, customerCart.id)
          : await repository.createCart(request.tenantId, { customerId: request.customerId })

      if (!target) {
        throw new AppError('Customer cart unavailable', 500, 'cart-merge-failed')
      }

      const guestItems = await repository.listCartItems(request.tenantId, source.id)
      for (const item of guestItems) {
        const existing = await repository.findCartItemByVariant(request.tenantId, target.id, item.variantId)
        if (existing) {
          await repository.updateCartItem(request.tenantId, existing.id, {
            quantity: existing.quantity + item.quantity,
            lineTotal: (existing.quantity + item.quantity) * existing.unitPrice,
          })
        } else {
          await repository.createCartItem(request.tenantId, target.id, {
            variantId: item.variantId,
            quantity: item.quantity,
            metadata: item.metadata,
            partnerId: item.partnerId,
            productType: item.productType,
            productTitleSnapshot: item.productTitleSnapshot,
            unitPrice: item.unitPrice,
          })
        }
      }

      await repository.deleteCartById(request.tenantId, source.id)
      const tenant = await this.requireTenantContext(request.tenantId)
      const refreshed = await this.refreshCartTotalsInTransaction(repository, tenant, target.id)
      return refreshed.id
    })

    await this.invalidateCache(request.tenantId, guestCart.id)
    if (mergedCartId) {
      await this.afterCartMutation(request.tenantId, mergedCartId)
    }
  }

  async unlinkGuestSession(tenantId: string, guestSessionId: string): Promise<void> {
    await this.repository.unlinkGuestSession(tenantId, guestSessionId)
  }

  async expireCart(payload: CartExpiryJobPayload): Promise<void> {
    const expiredCartId = await this.repository.transaction(async (repository) => {
      const cart = await repository.lockCart(payload.tenantId, payload.cartId)
      if (!cart || cart.tenantId !== payload.tenantId || cart.status === 'expired' || cart.status === 'converted') {
        return null
      }

      const items = await repository.listCartItems(payload.tenantId, cart.id)
      const snapshots = await this.snapshotMap(payload.tenantId, items.map((item) => item.variantId))
      const inventoryRepository = new InventoryRepository(repository.getDb())

      for (const item of items) {
        const snapshot = snapshots.get(item.variantId)
        if (snapshot?.trackInventory) {
          await this.releaseInventoryInTransaction(
            inventoryRepository,
            item.variantId,
            item.quantity,
            cart.id,
            payload.tenantId,
          )
        }
      }

      await repository.updateCart(payload.tenantId, cart.id, { status: 'expired', expiresAt: new Date() })
      return cart.id
    })

    if (!expiredCartId) {
      return
    }

    await this.invalidateCache(payload.tenantId, expiredCartId)
    await this.events?.publish('cart.expired', { tenantId: payload.tenantId, cartId: expiredCartId })
  }

  async cleanupExpiredCarts(limit = 100): Promise<{ processed: number }> {
    const expiredCarts = await this.repository.findExpiredActiveCarts(limit)
    let processed = 0

    for (const cart of expiredCarts) {
      try {
        await this.expireCart({ tenantId: cart.tenantId, cartId: cart.id })
        processed++
      } catch (err) {
        logger.error({ tenantId: cart.tenantId, cartId: cart.id, err }, 'Failed to process cart expiration cleanup')
      }
    }

    return { processed }
  }


  private async requireOwnedCart(tenantId: string, owner: CartOwner): Promise<CartRecord> {
    const cart = await this.getExistingCart(tenantId, owner)
    if (!cart) {
      throw new AppError('Cart not found', 404, 'cart-not-found')
    }
    if (cart.status === 'expired') {
      throw new AppError('Cart expired', 409, 'cart-expired')
    }
    return cart
  }

  private async getExistingCart(tenantId: string, owner: CartOwner): Promise<CartRecord | null> {
    const existing = await this.repository.findActiveCartByOwner(tenantId, owner)
    return existing
  }

  private async requireOwnedCartInTransaction(
    repository: CartRepository,
    tenantId: string,
    owner: CartOwner,
  ): Promise<CartRecord> {
    const cart =
      (await repository.findActiveCartByOwner(tenantId, owner)) ??
      null
    if (!cart) {
      throw new AppError('Cart not found', 404, 'cart-not-found')
    }
    const locked = await repository.lockCart(tenantId, cart.id)
    if (!locked || locked.status === 'expired') {
      throw new AppError('Cart expired', 409, 'cart-expired')
    }
    return locked
  }

  private async findOrCreateCartInTransaction(
    repository: CartRepository,
    tenantId: string,
    owner: CartOwner,
  ): Promise<CartRecord> {
    const existing = await repository.findActiveCartByOwner(tenantId, owner)
    if (existing) {
      return (await repository.lockCart(tenantId, existing.id)) ?? existing
    }

    // If it's a guest session, ensure the session exists in our database first
    const guestSessionId = 'guestSessionId' in owner ? owner.guestSessionId : undefined
    if (guestSessionId) {
      try {
        const customerRepo = new GuestSessionRepository(repository.getDb())
        const session = await customerRepo.findById(tenantId, guestSessionId)
        if (!session) {
          await customerRepo.create(tenantId, { id: guestSessionId })
        }
      } catch (err) {
        logger.error({ err, tenantId, guestSessionId }, 'failed to auto-create guest session')
        // We continue anyway, the cart creation might fail with FK error but we logged it
      }
    }

    return repository.createCart(tenantId, owner as CreateCartInput)
  }

  private async requireCartItem(
    repository: CartRepository,
    tenantId: string,
    cartId: string,
    itemId: string,
  ): Promise<CartItemRecord> {
    const item = await repository.findCartItemById(tenantId, cartId, itemId)
    if (!item) {
      throw new AppError('Cart item not found', 404, 'cart-item-not-found')
    }
    return item
  }

  private async requireActiveVariant(tenantId: string, variantId: string) {
    const snapshot = await this.requireVariantSnapshot(tenantId, variantId)
    if (snapshot.isDeleted || snapshot.productStatus !== 'active') {
      throw new AppError('Variant is unavailable', 409, 'cart-item-unavailable')
    }
    return snapshot
  }

  private async requireVariantSnapshot(tenantId: string, variantId: string) {
    const snapshot = (await this.repository.getVariantSnapshots(tenantId, [variantId]))[0]
    if (!snapshot) {
      throw new AppError('Variant not found', 404, 'variant-not-found')
    }
    return snapshot
  }

  private async snapshotMap(tenantId: string, variantIds: string[]) {
    const snapshots = await this.repository.getVariantSnapshots(tenantId, [...new Set(variantIds)])
    return new Map(snapshots.map((snapshot) => [snapshot.variantId, snapshot]))
  }

  private async refreshCartTotalsInTransaction(
    repository: CartRepository,
    tenant: TenantContext,
    cartId: string,
  ): Promise<CartRecord> {
    const cart = await repository.findCartById(tenant.tenantId, cartId)
    if (!cart) {
      throw new AppError('Cart not found', 404, 'cart-not-found')
    }
    const items = await repository.listCartItems(tenant.tenantId, cart.id)
    const snapshots = await this.snapshotMap(tenant.tenantId, items.map((item) => item.variantId))
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const shippingOptions = await this.shippingService.calculate({
      tenant,
      items: items.map((item) => {
        const snapshot = snapshots.get(item.variantId)
        return {
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          weight_grams: snapshot?.weightGrams ?? null,
          product_type: item.productType,
          partner_id: item.partnerId,
        }
      }),
      address: null,
      subtotal,
    })
    const selected = this.shippingService.selectOption(shippingOptions, cart.selectedShippingOptionId ?? undefined)
    const shippingAmount = selected?.amount ?? 0
    // Use the stored discount (written by a future PromotionService); defaults to 0
    const discountAmount = cart.discountAmount
    const total = subtotal - discountAmount + shippingAmount

    return repository.updateCart(tenant.tenantId, cart.id, {
      subtotal,
      shippingAmount,
      discountAmount,
      total,
      selectedShippingOptionId: selected?.id ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
  }

  private async getHydratedCart(tenant: TenantContext, cart: CartRecord): Promise<CartView> {
    const cacheEntry = await this.cache?.get<CartView>(cartKey(tenant.tenantId, cart.id))
    if (cacheEntry) {
      return cacheEntry
    }

    const items = await this.repository.listCartItems(tenant.tenantId, cart.id)
    const snapshots = await this.snapshotMap(tenant.tenantId, items.map((item) => item.variantId))
    const shippingOptions = await this.shippingService.calculate({
      tenant,
      items: items.map((item) => {
        const snapshot = snapshots.get(item.variantId)
        return {
          variant_id: item.variantId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          weight_grams: snapshot?.weightGrams ?? null,
          product_type: item.productType,
          partner_id: item.partnerId,
        }
      }),
      address: null,
      subtotal: cart.subtotal,
    })

    const view: CartView = {
      id: cart.id,
      customerId: cart.customerId,
      guestSessionId: cart.guestSessionId,
      couponCode: cart.couponCode,
      loyaltyPoints: cart.loyaltyPoints,
      status: cart.status,
      metadata: cart.metadata,
      subtotal: cart.subtotal,
      shippingAmount: cart.shippingAmount,
      discountAmount: cart.discountAmount,
      taxAmount: 0,
      total: cart.total,
      expiresAt: cart.expiresAt?.toISOString() ?? null,
      selectedShippingOptionId: cart.selectedShippingOptionId,
      shippingOptions,
      items: items.map((item): CartLineView => {
        const snapshot = snapshots.get(item.variantId)
        const currentUnitPrice = snapshot?.price ?? item.unitPrice
        return {
          id: item.id,
          variantId: item.variantId,
          partnerId: item.partnerId,
          productType: item.productType,
          productTitle: item.productTitleSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currentUnitPrice,
          metadata: item.metadata,
          lineTotal: item.lineTotal,
          priceChanged: currentUnitPrice !== item.unitPrice,
        }
      }),
    }

    await this.cache?.set(cartKey(tenant.tenantId, cart.id), view, CART_CACHE_TTL_SECONDS)
    return view
  }

  private async scheduleExpiry(tenantId: string, cartId: string): Promise<void> {
    if (!this.expiryScheduler) {
      return
    }

    const job = createCartExpiryJob({ tenantId, cartId })
    try {
      await this.expiryScheduler.upsertExpiryJob(job)
    } catch (error) {
      logger.error(
        {
          tenantId,
          cartId,
          queueName: job.queueName,
          jobName: job.jobName,
          jobId: job.jobId,
          err: error,
        },
        'failed to publish cart expiry job',
      )
    }
  }

  private async invalidateCache(tenantId: string, cartId: string): Promise<void> {
    await this.cache?.delete(cartKey(tenantId, cartId))
  }

  private async afterCartMutation(tenantId: string, cartId: string): Promise<void> {
    await this.invalidateCache(tenantId, cartId)
    await this.scheduleExpiry(tenantId, cartId)
  }

  private async requireLockedInventory(
    repository: InventoryRepository,
    tenantId: string,
    variantId: string,
  ): Promise<InventoryRecord> {
    let current = await repository.findByVariantIdForUpdate(tenantId, variantId)

    // Auto-create missing inventory record if it doesn't exist
    if (!current) {
      // We need to find the partnerId for this variant to create the record correctly
      const snapshot = await this.requireVariantSnapshot(tenantId, variantId)
      
      logger.warn(
        { tenantId, variantId, partnerId: snapshot.partnerId },
        'inventory record missing; auto-creating with zero stock and backorder enabled',
      )

      current = await repository.createInventoryRecord(tenantId, {
        variantId,
        partnerId: snapshot.partnerId,
        quantityAvailable: 0, // No fake stock; starts at 0
        allowBackorder: true, // Allow sale to proceed (backorder) for items without explicit inventory
      })
      // Lock it after creation
      current = await repository.findByVariantIdForUpdate(tenantId, variantId) ?? current
    }

    return current
  }

  private async reserveInventoryInTransaction(
    repository: InventoryRepository,
    variantId: string,
    quantity: number,
    cartId: string,
    tenantId: string,
  ): Promise<void> {
    const current = await this.requireLockedInventory(repository, tenantId, variantId)
    if (!current.allowBackorder && current.quantityAvailable < quantity) {
      throw new AppError('Insufficient stock', 409, 'insufficient-stock')
    }

    await repository.updateStock(tenantId, current.id, {
      quantityAvailable: current.quantityAvailable - quantity,
      quantityReserved: current.quantityReserved + quantity,
    })
    await repository.insertHistory({
      tenantId,
      partnerId: current.partnerId,
      variantId,
      delta: -quantity,
      reason: 'reserved',
      cartId,
    })
  }

  private async releaseInventoryInTransaction(
    repository: InventoryRepository,
    variantId: string,
    quantity: number,
    cartId: string,
    tenantId: string,
  ): Promise<void> {
    const current = await this.requireLockedInventory(repository, tenantId, variantId)
    const releasable = Math.min(quantity, current.quantityReserved)

    if (releasable < quantity) {
      logger.warn(
        { tenantId, variantId, requestedQuantity: quantity, reservedQuantity: current.quantityReserved },
        'inventory release quantity exceeded reserved stock; clamping release',
      )
    }

    if (releasable === 0) {
      return
    }

    await repository.updateStock(tenantId, current.id, {
      quantityAvailable: current.quantityAvailable + releasable,
      quantityReserved: current.quantityReserved - releasable,
    })
    await repository.insertHistory({
      tenantId,
      partnerId: current.partnerId,
      variantId,
      delta: releasable,
      reason: 'released',
      cartId,
    })
  }

  private assertCheckoutStockAvailable(stock: InventoryRecord, quantity: number): void {
    if (stock.allowBackorder) {
      return
    }

    if (stock.quantityAvailable + stock.quantityReserved < quantity) {
      throw new AppError('Insufficient stock for checkout', 409, 'insufficient-stock')
    }
  }

  private async requireTenantContext(tenantId: string): Promise<TenantContext> {
    if (!this.tenantResolver) {
      throw new AppError('Tenant resolver is not configured', 500, 'tenant-resolver-missing')
    }

    return this.tenantResolver(tenantId)
  }
}

import { AppError } from '../../lib/errors.js'
import type { TenantContext } from '../../layers/tenancy/tenancy.types.js'
import type { EventPublisher } from '../../providers/events/event-bus.interface.js'
import type { AddressRepository } from '../customers/customers.repository.js'
import type { AuthenticatedCustomer } from '../customers/customers.types.js'
import type { ShippingService } from '../shipping/shipping.service.js'
import type { CartRepository } from '../cart/cart.repository.js'
import type { OrdersService } from '../orders/orders.service.js'
import type { PlaceOrderActor } from '../orders/orders.types.js'
import type { CheckoutRepository } from './checkout.repository.js'
import type {
  CheckoutGroupRecord,
  CheckoutRecord,
  CompleteCheckoutInput,
  InitiateCheckoutInput,
  SelectShippingInput,
} from './checkout.types.js'

export class CheckoutService {
  constructor(
    private readonly repository: CheckoutRepository,
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService,
    private readonly addressRepository?: AddressRepository,
    private readonly cartRepository?: CartRepository,
    private readonly events?: EventPublisher,
  ) {}

  async initiateCheckout(
    tenant: TenantContext,
    input: InitiateCheckoutInput,
    actor?: AuthenticatedCustomer,
  ): Promise<CheckoutRecord> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes TTL

    let items = input.items ?? []
    let couponCode = input.couponCode ?? null
    let discountAmount = 0

    if (input.cartId && this.cartRepository) {
      const cart = await this.cartRepository.findCartById(tenant.tenantId, input.cartId)
      if (!cart) throw new AppError('Cart not found', 404, 'cart-not-found')
      if (cart.status !== 'active') throw new AppError('Cart is not active', 409, 'cart-not-active')

      const cartItems = await this.cartRepository.listCartItems(tenant.tenantId, input.cartId)
      if (cartItems.length === 0) throw new AppError('Cart is empty', 400, 'cart-empty')

      items = cartItems.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        metadata: (i.metadata as Record<string, unknown>) ?? {},
      }))
      couponCode = cart.couponCode ?? couponCode
      discountAmount = cart.discountAmount ?? 0
    }

    if (items.length === 0) {
      throw new AppError('No items specified for checkout', 400, 'checkout-items-empty')
    }

    const checkout = await this.repository.createCheckout({
      tenantId: tenant.tenantId,
      customerId: actor?.customerId ?? null,
      guestEmail: actor ? null : input.guestEmail ?? null,
      status: 'CREATED',
      shippingAddressSnapshot: input.shippingAddress ?? null,
      billingAddressSnapshot: input.billingAddress ?? input.shippingAddress ?? null,
      shippingMethodSnapshot: null,
      couponCodeSnapshot: couponCode,
      discountAmount,
      shippingAmount: 0,
      taxAmount: 0,
      subtotal: 0,
      total: 0,
      paymentMethod: null,
      metadata: { items, notes: input.notes },
      expiresAt,
    })

    return checkout
  }

  async getCheckout(tenantId: string, checkoutId: string): Promise<CheckoutRecord> {
    const checkout = await this.repository.findCheckoutById(tenantId, checkoutId)
    if (!checkout) throw new AppError('Checkout session not found', 404, 'checkout-not-found')
    return checkout
  }

  async selectShipping(
    tenantId: string,
    checkoutId: string,
    input: SelectShippingInput,
  ): Promise<CheckoutRecord> {
    const checkout = await this.getCheckout(tenantId, checkoutId)
    if (checkout.status !== 'CREATED') {
      throw new AppError('Checkout session is no longer active', 409, 'checkout-inactive')
    }

    const next = await this.repository.updateCheckout(tenantId, checkoutId, {
      shippingMethodSnapshot: { selectedShippingOptionId: input.shippingOptionId },
      updatedAt: new Date(),
    })

    return next
  }

  async completeCheckout(
    tenant: TenantContext,
    checkoutId: string,
    input: CompleteCheckoutInput,
    actor?: AuthenticatedCustomer,
  ): Promise<{ checkout: CheckoutRecord; checkoutGroup: CheckoutGroupRecord; result: any }> {
    const checkout = await this.getCheckout(tenant.tenantId, checkoutId)

    if (checkout.status === 'COMPLETED') {
      throw new AppError('Checkout already completed', 409, 'checkout-already-completed')
    }

    if (checkout.expiresAt && checkout.expiresAt < new Date()) {
      await this.repository.updateCheckout(tenant.tenantId, checkoutId, { status: 'EXPIRED' })
      throw new AppError('Checkout session has expired', 410, 'checkout-expired')
    }

    // Place order via OrdersService
    const metadata = (checkout.metadata as { items?: any[]; notes?: string }) ?? {}
    const items = metadata.items ?? []

    const placeOrderInput: any = {
      guestEmail: checkout.guestEmail ?? undefined,
      shippingAddress: checkout.shippingAddressSnapshot ?? undefined,
      billingAddress: checkout.billingAddressSnapshot ?? undefined,
      notes: input.notes ?? metadata.notes,
      items,
    }

    const placeOrderActor: PlaceOrderActor | undefined = actor?.customerId
      ? { customerId: actor.customerId, email: actor.email }
      : undefined

    const result = await this.ordersService.placeOrderForOwner(
      tenant,
      actor?.customerId ? { customerId: actor.customerId } : { guestSessionId: checkoutId },
      placeOrderInput,
      placeOrderActor,
    )

    const createdOrders = result.orders ?? [result.order]
    const totalAmount = result.paymentIntent?.amount ?? createdOrders.reduce((sum: number, o: any) => sum + o.total, 0)

    const checkoutGroup = await this.repository.createCheckoutGroup({
      tenantId: tenant.tenantId,
      checkoutId: checkout.id,
      customerId: actor?.customerId ?? checkout.customerId ?? null,
      guestEmail: actor ? null : checkout.guestEmail ?? null,
      paymentIntentId: result.paymentIntent?.id ?? null,
      orderCount: createdOrders.length,
      totalAmount,
      currency: tenant.config.currency,
      status: 'PENDING',
    })

    const updatedCheckout = await this.repository.updateCheckout(tenant.tenantId, checkoutId, {
      status: 'PAYMENT_PENDING',
      paymentMethod: input.paymentMethod,
      updatedAt: new Date(),
    })

    await this.events?.publish('checkout.completed', {
      checkoutId: checkout.id,
      checkoutGroupId: checkoutGroup.id,
      tenantId: tenant.tenantId,
      orderIds: createdOrders.map((o: any) => o.id),
    })

    return { checkout: updatedCheckout, checkoutGroup, result }
  }

  async getCheckoutGroup(tenantId: string, groupId: string): Promise<CheckoutGroupRecord> {
    const group = await this.repository.findCheckoutGroupById(tenantId, groupId)
    if (!group) throw new AppError('Checkout group not found', 404, 'checkout-group-not-found')
    return group
  }
}

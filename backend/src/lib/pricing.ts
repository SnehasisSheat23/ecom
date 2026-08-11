import type { TenantContext } from '../layers/tenancy/tenancy.types.js'
import type { OrderTotal, PricingCart } from '../modules/shipping/shipping.types.js'
import type { ShippingService } from '../modules/shipping/shipping.service.js'

export const calculateOrderTotal = async (
  cart: PricingCart,
  tenant: TenantContext,
  shippingService: ShippingService,
  selectedShippingOptionId?: string,
  metadata?: Record<string, unknown>,
): Promise<OrderTotal> => {
  const subtotal = shippingService.subtotalFromCart(cart)
  const shippingOptions = await shippingService.calculate({
    items: shippingService.toPricingItems(cart.items),
    address: null,
    tenant,
    subtotal,
    metadata,
  })
  const selectedShippingOption = shippingService.selectOption(
    shippingOptions,
    selectedShippingOptionId,
  )
  const discount = 0
  const tax = 0
  const shipping = selectedShippingOption?.amount ?? 0

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: subtotal - discount + shipping + tax,
    shippingOptions,
    selectedShippingOptionId: selectedShippingOption?.id ?? null,
  }
}

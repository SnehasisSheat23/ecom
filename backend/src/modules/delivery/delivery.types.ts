export interface ShipmentDetails {
  carrierId: string
  trackingNumber: string
  trackingUrl?: string
  estimatedDelivery?: Date
  labelUrl?: string
  invoiceUrl?: string
  rawResponse?: Record<string, unknown>
}

export interface TrackingEvent {
  status: string
  location?: string
  description?: string
  eventTime: Date
}

export interface DeliveryProvider {
  createShipment(
    config: any,
    order: {
      id: string
      orderNumber: string
      shippingAddress: any
      billingAddress: any
      total: number
      shippingAmount: number
    },
    items: Array<{
      productId: string
      variantId: string
      productTitle: string
      variantTitle: string
      sku: string
      unitPrice: number
      quantity: number
    }>
  ): Promise<ShipmentDetails>

  cancelShipment(config: any, carrierId: string): Promise<boolean>

  parseWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<{
    carrierId: string
    awbNumber: string
    status: 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY'
    events: TrackingEvent[]
  }>

  calculateRates(
    config: any,
    input: {
      originPincode: string
      destinationPincode: string
      weightGrams: number
      subtotal: number
    }
  ): Promise<Array<{
    id: string
    label: string
    amount: number
    estimatedDays: number
  }>>
}

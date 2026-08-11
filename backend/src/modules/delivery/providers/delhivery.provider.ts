import type { DeliveryProvider, ShipmentDetails, TrackingEvent } from '../delivery.types.js'

export class DelhiveryShippingProvider implements DeliveryProvider {
  async createShipment(
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
  ): Promise<ShipmentDetails> {
    const baseUrl = config.baseUrl || 'https://staging-express.delhivery.com'
    const url = `${baseUrl}/api/cmu/create.json`

    // Build Delhivery CMU payload
    // Delhivery requires consignment creation parameters inside a form-encoded 'data' parameter containing a JSON string
    const consignee = order.shippingAddress
    const payload = {
      pickup_location: {
        name: config.pickupLocationName || 'Platform Store',
        add: config.pickupAddress || 'Warehouse Address',
        city: config.pickupCity || 'City',
        state: config.pickupState || 'State',
        country: config.pickupCountry || 'IN',
        pin: config.pickupPincode || '560001',
        phone: config.pickupPhone || '9999999999'
      },
      shipments: [
        {
          order: order.orderNumber,
          waybill: '', // Leave blank to auto-generate AWB
          consignee: {
            name: consignee.fullName || 'Customer',
            add: `${consignee.line1} ${consignee.line2 || ''}`.trim(),
            city: consignee.city,
            state: consignee.state,
            country: consignee.country || 'IN',
            pin: consignee.postalCode,
            phone: consignee.phone || '9999999999'
          },
          products: items.map(item => ({
            name: `${item.productTitle} - ${item.variantTitle}`,
            quantity: item.quantity,
            price: item.unitPrice
          })),
          payment_mode: 'Pre-paid',
          total_amount: order.total,
          cod_amount: 0,
          shipping_amount: order.shippingAmount
        }
      ]
    }

    const formBody = new URLSearchParams()
    formBody.append('format', 'json')
    formBody.append('data', JSON.stringify(payload))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Token ${config.authToken}`
      },
      body: formBody.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Delhivery booking failed: ${response.status} - ${errorText}`)
    }

    const result = (await response.json()) as any

    if (!result.success || !result.packages || result.packages.length === 0) {
      throw new Error(`Delhivery booking response error: ${JSON.stringify(result)}`)
    }

    const pkg = result.packages[0]
    return {
      carrierId: pkg.waybill || pkg.id || order.orderNumber,
      trackingNumber: pkg.waybill || '',
      trackingUrl: `https://www.delhivery.com/track/package/${pkg.waybill || ''}`,
      labelUrl: pkg.label_url || null,
      invoiceUrl: pkg.invoice_url || null,
      rawResponse: result
    }
  }

  async cancelShipment(config: any, carrierId: string): Promise<boolean> {
    const baseUrl = config.baseUrl || 'https://staging-express.delhivery.com'
    const url = `${baseUrl}/api/p/edit`

    const payload = {
      waybill: carrierId,
      cancellation: 'true'
    }

    const formBody = new URLSearchParams()
    formBody.append('format', 'json')
    formBody.append('data', JSON.stringify(payload))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Token ${config.authToken}`
      },
      body: formBody.toString()
    })

    return response.ok
  }

  async parseWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<{
    carrierId: string
    awbNumber: string
    status: 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY'
    events: TrackingEvent[]
  }> {
    const shipment = payload.Shipment
    if (!shipment) {
      throw new Error('Invalid Delhivery webhook payload: Missing Shipment object')
    }

    const statusObj = shipment.Status
    const statusText = statusObj?.Status || 'Unknown'
    
    // Map Delhivery status text to internal status enum
    let status: 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' = 'IN_TRANSIT'
    
    const lowerStatus = statusText.toLowerCase()
    if (lowerStatus.includes('delivered')) {
      status = 'DELIVERED'
    } else if (lowerStatus.includes('cancel') || lowerStatus.includes('return')) {
      status = 'CANCELLED'
    } else if (lowerStatus.includes('out for delivery') || lowerStatus.includes('ofd')) {
      status = 'OUT_FOR_DELIVERY'
    } else if (lowerStatus.includes('manifest') || lowerStatus.includes('ship')) {
      status = 'SHIPPED'
    } else {
      status = 'IN_TRANSIT'
    }

    const eventTime = statusObj?.StatusDateTime ? new Date(statusObj.StatusDateTime) : new Date()

    const events: TrackingEvent[] = [{
      status: statusText,
      location: statusObj?.StatusLocation || null,
      description: statusObj?.Instructions || null,
      eventTime
    }]

    return {
      carrierId: shipment.AWB,
      awbNumber: shipment.AWB,
      status,
      events
    }
  }

  async calculateRates(
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
  }>> {
    const baseUrl = config.baseUrl || 'https://staging-express.delhivery.com'
    const params = new URLSearchParams({
      md: 'E',
      cgm: String(input.weightGrams || 500),
      ss: 'Delivered',
      o_pin: input.originPincode,
      d_pin: input.destinationPincode
    })

    const url = `${baseUrl}/api/kinko/v1/invoice/charges/.json?${params.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${config.authToken}`
      }
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Delhivery rate calculation failed: ${response.status} - ${text}`)
    }

    const result = (await response.json()) as any
    let totalAmount = 0
    if (result && result.data && result.data.shipping_charges) {
      totalAmount = result.data.shipping_charges.total_amount
    } else if (result && typeof result.total_amount === 'number') {
      totalAmount = result.total_amount
    } else if (Array.isArray(result) && result[0]) {
      totalAmount = result[0].total_amount || result[0].total || 0
    } else {
      totalAmount = result?.total_amount || result?.total || 0
    }

    const amountInSubunits = Math.round(totalAmount * 100)

    return [
      {
        id: 'delhivery-express',
        label: 'Delhivery Express',
        amount: amountInSubunits,
        estimatedDays: 3
      }
    ]
  }
}

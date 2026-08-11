import { eq, and, sql } from 'drizzle-orm'
import type { Database } from '../../lib/db.js'
import { AppError } from '../../lib/errors.js'
import { orders, orderItems, shipments, shipmentTrackingLogs } from '../orders/orders.schema.js'
import { partnerDeliveryConfigs } from './delivery.schema.js'
import type { DeliveryProvider } from './delivery.types.js'
import { ManualShippingProvider } from './providers/manual.provider.js'
import { DelhiveryShippingProvider } from './providers/delhivery.provider.js'

const STATUS_PRIORITY: Record<string, number> = {
  'PENDING': 0,
  'CONFIRMED': 1,
  'PROCESSING': 2,
  'SHIPPED': 3,
  'DELIVERED': 4,
  'CANCELLED': 5,
}

export class DeliveryService {
  constructor(private readonly db: Database) {}

  getProvider(provider: string): DeliveryProvider {
    switch (provider.toLowerCase()) {
      case 'delhivery':
        return new DelhiveryShippingProvider()
      case 'manual':
      default:
        return new ManualShippingProvider()
    }
  }

  async getActiveConfig(tenantId: string, partnerId: string | null): Promise<any> {
    if (partnerId) {
      const [vendorConfig] = await this.db
        .select()
        .from(partnerDeliveryConfigs)
        .where(
          and(
            eq(partnerDeliveryConfigs.tenantId, tenantId),
            eq(partnerDeliveryConfigs.partnerId, partnerId),
            eq(partnerDeliveryConfigs.isActive, true)
          )
        )
      if (vendorConfig) return vendorConfig
    }

    const [tenantConfig] = await this.db
      .select()
      .from(partnerDeliveryConfigs)
      .where(
        and(
          eq(partnerDeliveryConfigs.tenantId, tenantId),
          sql`${partnerDeliveryConfigs.partnerId} IS NULL`,
          eq(partnerDeliveryConfigs.isActive, true)
        )
      )
    
    return tenantConfig || null
  }

  async upsertConfig(
    tenantId: string,
    partnerId: string | null,
    provider: string,
    credentials: any,
    isActive = true
  ): Promise<any> {
    const [existing] = await this.db
      .select()
      .from(partnerDeliveryConfigs)
      .where(
        and(
          eq(partnerDeliveryConfigs.tenantId, tenantId),
          partnerId ? eq(partnerDeliveryConfigs.partnerId, partnerId) : sql`${partnerDeliveryConfigs.partnerId} IS NULL`
        )
      )

    if (existing) {
      const [updated] = await this.db
        .update(partnerDeliveryConfigs)
        .set({
          provider,
          credentials,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(partnerDeliveryConfigs.id, existing.id))
        .returning()
      return updated
    } else {
      const [created] = await this.db
        .insert(partnerDeliveryConfigs)
        .values({
          tenantId,
          partnerId,
          provider,
          credentials,
          isActive,
        })
        .returning()
      return created
    }
  }

  async bookShipment(tenantId: string, orderId: string): Promise<any> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
    if (!order) {
      throw new AppError('Order not found', 404, 'order-not-found')
    }

    const partnerId = order.partnerId
    const items = await this.db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, orderId)))

    if (items.length === 0) {
      throw new AppError('No items found for shipment booking', 400, 'no-items-to-ship')
    }

    const config = await this.getActiveConfig(tenantId, partnerId)
    const providerName = config?.provider || 'manual'
    const provider = this.getProvider(providerName)

    const details = await provider.createShipment(
      config?.credentials || {},
      {
        id: order.id,
        orderNumber: order.orderNumber,
        shippingAddress: order.shippingAddressSnapshot,
        billingAddress: order.billingAddressSnapshot,
        total: order.total,
        shippingAmount: order.shippingAmount
      },
      items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        productTitle: item.productTitleSnapshot,
        variantTitle: item.variantTitleSnapshot,
        sku: item.skuSnapshot,
        unitPrice: item.unitPriceSnapshot,
        quantity: item.quantity
      }))
    )

    const [shipment] = await this.db
      .insert(shipments)
      .values({
        tenantId,
        orderId,
        provider: providerName,
        carrierId: details.carrierId,
        awbNumber: details.trackingNumber || null,
        shippingStatus: 'READY_FOR_PICKUP',
        labelUrl: details.labelUrl || null,
        invoiceUrl: details.invoiceUrl || null,
        trackingUrl: details.trackingUrl || null,
        rawResponse: details.rawResponse || null,
      })
      .returning()

    return shipment
  }

  async processWebhookUpdate(
    tenantId: string,
    providerName: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    const provider = this.getProvider(providerName)
    const update = await provider.parseWebhook(payload, headers)

    await this.db.transaction(async (tx) => {
      const [shipment] = await tx
        .select()
        .from(shipments)
        .where(
          and(
            eq(shipments.tenantId, tenantId),
            eq(shipments.provider, providerName),
            eq(shipments.awbNumber, update.awbNumber)
          )
        )
      if (!shipment) {
        throw new AppError('Shipment not found for tracking update', 404, 'shipment-not-found')
      }

      for (const event of update.events) {
        const [existingLog] = await tx
          .select()
          .from(shipmentTrackingLogs)
          .where(
            and(
              eq(shipmentTrackingLogs.tenantId, tenantId),
              eq(shipmentTrackingLogs.shipmentId, shipment.id),
              eq(shipmentTrackingLogs.status, event.status),
              eq(shipmentTrackingLogs.eventTime, event.eventTime)
            )
          )

        if (!existingLog) {
          await tx
            .insert(shipmentTrackingLogs)
            .values({
              tenantId,
              shipmentId: shipment.id,
              status: event.status,
              description: event.description || null,
              location: event.location || null,
              eventTime: event.eventTime
            })
        }
      }

      await tx
        .update(shipments)
        .set({
          shippingStatus: update.status,
          updatedAt: new Date()
        })
        .where(eq(shipments.id, shipment.id))

      await this.propagateStatus(tenantId, shipment, update.status, tx as Database)
    })
  }

  private async propagateStatus(
    tenantId: string,
    shipment: any,
    carrierStatus: string,
    tx: Database = this.db
  ): Promise<void> {
    let targetOrderStatus: import('../orders/orders.types.js').OrderStatus | null = null

    switch (carrierStatus) {
      case 'DELIVERED':
        targetOrderStatus = 'DELIVERED'
        break
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        targetOrderStatus = 'SHIPPED'
        break
      case 'CANCELLED':
        targetOrderStatus = null
        break
    }

    if (!targetOrderStatus || !shipment.orderId) return

    const priority = STATUS_PRIORITY[targetOrderStatus] ?? -1

    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.id, shipment.orderId)))
    
    if (order) {
      const currentPriority = STATUS_PRIORITY[order.status] ?? -1
      if (priority > currentPriority) {
        await tx
          .update(orders)
          .set({
            status: targetOrderStatus,
            trackingNumber: shipment.awbNumber,
            trackingUrl: shipment.trackingUrl,
            updatedAt: new Date()
          })
          .where(eq(orders.id, shipment.orderId))
      }
    }
  }
}

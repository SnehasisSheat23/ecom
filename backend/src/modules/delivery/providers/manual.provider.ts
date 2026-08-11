import type { DeliveryProvider, ShipmentDetails } from '../delivery.types.js'

export class ManualShippingProvider implements DeliveryProvider {
  async createShipment(): Promise<ShipmentDetails> {
    // Manual fulfillment does not make external API calls
    return {
      carrierId: `MANUAL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      trackingNumber: '',
    }
  }

  async cancelShipment(): Promise<boolean> {
    return true
  }

  async parseWebhook(): Promise<never> {
    throw new Error('Manual provider does not support webhooks')
  }

  async calculateRates(): Promise<any[]> {
    return []
  }
}

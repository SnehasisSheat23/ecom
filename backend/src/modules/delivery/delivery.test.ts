import { describe, expect, it, vi } from 'vitest'
import { DeliveryService } from './delivery.service.js'
import { ManualShippingProvider } from './providers/manual.provider.js'
import { DelhiveryShippingProvider } from './providers/delhivery.provider.js'

describe('DeliveryService Factory', () => {
  const mockDb = {} as any
  const service = new DeliveryService(mockDb)

  it('returns ManualShippingProvider for manual provider', () => {
    const provider = service.getProvider('manual')
    expect(provider).toBeInstanceOf(ManualShippingProvider)
  })

  it('returns DelhiveryShippingProvider for delhivery provider', () => {
    const provider = service.getProvider('delhivery')
    expect(provider).toBeInstanceOf(DelhiveryShippingProvider)
  })
})

describe('DelhiveryShippingProvider Webhook Parser', () => {
  const provider = new DelhiveryShippingProvider()

  it('correctly maps Delhivery status to internal status ENUMs', async () => {
    const payload = {
      Shipment: {
        Status: {
          Status: 'Delivered',
          StatusDateTime: '2026-05-26T02:40:00.000',
          StatusLocation: 'Mumbai Hub',
          Instructions: 'Handed over to customer'
        },
        AWB: '999999999'
      }
    }

    const result = await provider.parseWebhook(payload, {})
    expect(result.status).toBe('DELIVERED')
    expect(result.awbNumber).toBe('999999999')
    expect(result.events[0]).toMatchObject({
      status: 'Delivered',
      location: 'Mumbai Hub',
      description: 'Handed over to customer'
    })
  })

  it('maps in-transit carrier statuses to IN_TRANSIT', async () => {
    const payload = {
      Shipment: {
        Status: {
          Status: 'In Transit - Out of Sorting Office',
          StatusDateTime: '2026-05-26T02:40:00.000',
          StatusLocation: 'Delhi Hub',
          Instructions: 'On the way'
        },
        AWB: '111111111'
      }
    }

    const result = await provider.parseWebhook(payload, {})
    expect(result.status).toBe('IN_TRANSIT')
  })

  it('maps manifest uploaded / picked up to SHIPPED', async () => {
    const payload = {
      Shipment: {
        Status: {
          Status: 'Manifest Uploaded',
          StatusDateTime: '2026-05-26T02:40:00.000',
          StatusLocation: 'Warehouse Hub',
          Instructions: 'Ready'
        },
        AWB: '222222222'
      }
    }

    const result = await provider.parseWebhook(payload, {})
    expect(result.status).toBe('SHIPPED')
  })
})

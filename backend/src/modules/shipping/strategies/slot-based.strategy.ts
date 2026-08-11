import type { CalculateShippingInput, ShippingOption, AvailableSlotInfo } from '../shipping.types.js'
import type { IShippingStrategy, StrategyContext } from './strategy.interface.js'

export class SlotBasedStrategy implements IShippingStrategy {
  readonly name = 'slot_based'

  async calculate(input: CalculateShippingInput, context: StrategyContext): Promise<ShippingOption[]> {
    const { tenant, deliveryDate, selectedSlotId } = input
    const { dbMethods } = context

    const timezone = (tenant.config as any)?.storefront?.localization?.timezone || (tenant.config as any)?.timezone || 'Asia/Kolkata'
    const now = new Date()

    // Format current time and date in tenant timezone (IST: Asia/Kolkata)
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const currentTimeString = timeFormatter.format(now) // e.g. "14:30" in IST
    const todayString = dateFormatter.format(now) // e.g. "2026-08-08" in IST
    const isToday = !deliveryDate || deliveryDate === todayString

    if (dbMethods && dbMethods.length > 0) {
      return dbMethods.map((method) => {
        const slotsList: AvailableSlotInfo[] = (method.slots || []).map((slotDef: any) => {
          const isExpired = isToday && slotDef.cutoffTime && currentTimeString > slotDef.cutoffTime
          return {
            id: slotDef.id,
            label: slotDef.label,
            timeWindow: slotDef.timeWindow,
            cutoffTime: slotDef.cutoffTime,
            surcharge: slotDef.surchargeCents || 0,
            isAvailable: !isExpired,
          }
        })

        // If specific slot selected, apply its surcharge to the base rate
        let baseAmount = method.flatRate ?? tenant.config.shipping_flat_rate
        if (selectedSlotId) {
          const chosenSlot = slotsList.find((s) => s.id === selectedSlotId)
          if (chosenSlot) {
            baseAmount += chosenSlot.surcharge
          }
        }

        return {
          id: method.id,
          label: method.name,
          description: `${method.estimatedDays} business days`,
          estimated_days: method.estimatedDays,
          amount: baseAmount,
          slots: slotsList,
        }
      })
    }

    // Default fallback slot schedule (Standard, Fixed Time, Midnight)
    const defaultSlots: AvailableSlotInfo[] = [
      {
        id: 'std-slot',
        label: 'Standard Delivery (09:00 AM - 09:00 PM)',
        timeWindow: '09:00 - 21:00',
        cutoffTime: '18:00',
        surcharge: 0,
        isAvailable: !isToday || currentTimeString <= '18:00',
      },
      {
        id: 'fixed-slot',
        label: 'Fixed Time Delivery (Narrow 1-hour window)',
        timeWindow: '14:00 - 15:00',
        cutoffTime: '13:00',
        surcharge: 15000, // ₹150 surcharge
        isAvailable: !isToday || currentTimeString <= '13:00',
      },
      {
        id: 'midnight-slot',
        label: 'Midnight Delivery (11:00 PM - 11:59 PM)',
        timeWindow: '23:00 - 23:59',
        cutoffTime: '21:00',
        surcharge: 25000, // ₹250 surcharge
        isAvailable: !isToday || currentTimeString <= '21:00',
      },
    ]

    let selectedSurcharge = 0
    if (selectedSlotId) {
      const chosen = defaultSlots.find((s) => s.id === selectedSlotId)
      if (chosen) selectedSurcharge = chosen.surcharge
    }

    return [
      {
        id: 'slot-option',
        label: 'Select Delivery Slot',
        description: 'Choose preferred date and time slot',
        estimated_days: 0,
        amount: tenant.config.shipping_flat_rate + selectedSurcharge,
        slots: defaultSlots,
      },
    ]
  }
}

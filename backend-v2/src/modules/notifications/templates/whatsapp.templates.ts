import type {
  NotificationEvent,
  OrderPlacedPayload,
  OrderStatusChangedPayload,
  QuotationRequestedPayload,
  QuotationRespondedPayload,
  OutgoingWhatsAppMessage,
} from '../types.js'

export function renderWhatsAppTemplate(event: NotificationEvent, payload: any): OutgoingWhatsAppMessage | null {
  const phone = payload.customerPhone
  if (!phone) return null

  switch (event) {
    case 'ORDER_PLACED': {
      const p = payload as OrderPlacedPayload
      const msg = `🛍️ *Order Confirmed!* #${p.orderNumber}\n\nHi ${p.customerName}, thank you for ordering with Abdullah Bakheet.\n\n*Total:* ${p.currency} ${Number(p.totalAmount).toFixed(2)}\n*Items:* ${p.items.length} item(s)\n${p.trackingUrl ? `\nTrack your order: ${p.trackingUrl}` : ''}`
      return { to: phone, message: msg }
    }

    case 'ORDER_STATUS_CHANGED': {
      const p = payload as OrderStatusChangedPayload
      const msg = `📦 *Order Update* #${p.orderNumber}\n\nHi ${p.customerName}, your order status is now: *${p.newStatus.toUpperCase()}*.\n${p.trackingNumber ? `*Tracking #:* ${p.trackingNumber}\n` : ''}${p.trackingUrl ? `Link: ${p.trackingUrl}` : ''}`
      return { to: phone, message: msg }
    }

    case 'B2B_QUOTATION_REQUESTED': {
      const p = payload as QuotationRequestedPayload
      const msg = `📄 *Quotation Received* #${p.quoteNumber}\n\nDear ${p.customerName}, we received your B2B request for ${p.itemsCount} item(s). Our sales team will respond with custom pricing shortly.`
      return { to: phone, message: msg }
    }

    case 'B2B_QUOTATION_RESPONDED': {
      const p = payload as QuotationRespondedPayload
      const msg = `💼 *Custom Quote Ready!* #${p.quoteNumber}\n\nDear ${p.customerName}, your B2B wholesale quotation has been prepared.\n*Total:* ${p.currency} ${Number(p.totalAmount).toFixed(2)}\n${p.paymentLink ? `Review Quote: ${p.paymentLink}` : ''}`
      return { to: phone, message: msg }
    }

    default:
      return null
  }
}

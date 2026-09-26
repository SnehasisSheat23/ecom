import type { NotificationAdapter, OutgoingWhatsAppMessage, AdapterResult } from '../types.js'

export class WhatsAppAdapter implements NotificationAdapter {
  readonly channel = 'whatsapp'
  readonly name = 'WhatsAppAdapter'

  private apiToken?: string
  private phoneNumberId?: string

  constructor() {
    this.apiToken = process.env.WHATSAPP_API_TOKEN
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  }

  async sendWhatsApp(msg: OutgoingWhatsAppMessage): Promise<AdapterResult> {
    // 1. If Meta WhatsApp Cloud API credentials are configured
    if (this.apiToken && this.phoneNumberId) {
      try {
        const cleanRecipient = msg.to.replace(/[^\d]/g, '')
        const res = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanRecipient,
            type: 'text',
            text: { preview_url: false, body: msg.message },
          }),
        })

        const data: any = await res.json()
        if (!res.ok) {
          console.error('[WhatsAppAdapter Error]', data)
          return {
            success: false,
            channel: 'whatsapp',
            provider: 'meta-cloud-api',
            error: data.error?.message || 'Failed to dispatch WhatsApp message',
          }
        }

        console.log(`[WhatsAppAdapter Sent] To: ${msg.to} | ID: ${data.messages?.[0]?.id}`)
        return {
          success: true,
          channel: 'whatsapp',
          provider: 'meta-cloud-api',
          messageId: data.messages?.[0]?.id,
        }
      } catch (err: any) {
        console.error('[WhatsAppAdapter Network Error]', err)
        return {
          success: false,
          channel: 'whatsapp',
          provider: 'meta-cloud-api',
          error: err.message,
        }
      }
    }

    // 2. Dev / Mock Fallback Logger
    console.log('────────────────────────────────────────────────────────────────')
    console.log(`💬  [WHATSAPP NOTIFICATION (Dev Mock)]`)
    console.log(`   To:      ${msg.to}`)
    console.log(`   Content: ${msg.message.replace(/\n/g, ' ')}`)
    console.log(`   (Configure WHATSAPP_API_TOKEN in .env to deliver live messages)`)
    console.log('────────────────────────────────────────────────────────────────')

    return {
      success: true,
      channel: 'whatsapp',
      provider: 'mock-dev',
      messageId: `mock_wa_${Date.now()}`,
    }
  }
}

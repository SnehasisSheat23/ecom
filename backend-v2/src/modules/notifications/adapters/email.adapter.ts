import type { NotificationAdapter, OutgoingEmailMessage, AdapterResult } from '../types.js'

export class EmailAdapter implements NotificationAdapter {
  readonly channel = 'email'
  readonly name = 'EmailAdapter'

  private resendApiKey?: string
  private fromEmail: string

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY
    this.fromEmail = process.env.EMAIL_FROM || 'Abdullah Bakheet <orders@abdullahbakheet.com>'
  }

  async sendEmail(msg: OutgoingEmailMessage): Promise<AdapterResult> {
    // 1. If Resend API Key is configured, send live email via Resend REST API
    if (this.resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: msg.from || this.fromEmail,
            to: [msg.to],
            subject: msg.subject,
            html: msg.html,
            text: msg.text,
          }),
        })

        const data: any = await res.json()
        if (!res.ok) {
          console.error('[EmailAdapter:Resend Error]', data)
          return {
            success: false,
            channel: 'email',
            provider: 'resend',
            error: data.message || 'Failed to dispatch email via Resend',
          }
        }

        console.log(`[EmailAdapter:Resend Sent] To: ${msg.to} | Subject: "${msg.subject}" | ID: ${data.id}`)
        return {
          success: true,
          channel: 'email',
          provider: 'resend',
          messageId: data.id,
        }
      } catch (err: any) {
        console.error('[EmailAdapter:Resend Network Error]', err)
        return {
          success: false,
          channel: 'email',
          provider: 'resend',
          error: err.message,
        }
      }
    }

    // 2. Dev / Mock Fallback Logger (No API Key set)
    console.log('────────────────────────────────────────────────────────────────')
    console.log(`✉️  [EMAIL NOTIFICATION (Dev Mock)]`)
    console.log(`   To:       ${msg.toName ? `${msg.toName} <${msg.to}>` : msg.to}`)
    console.log(`   From:     ${msg.from || this.fromEmail}`)
    console.log(`   Subject:  ${msg.subject}`)
    console.log(`   Snippet:  ${msg.text.split('\n')[0]}`)
    console.log(`   (Configure RESEND_API_KEY in .env to deliver live emails)`)
    console.log('────────────────────────────────────────────────────────────────')

    return {
      success: true,
      channel: 'email',
      provider: 'mock-dev',
      messageId: `mock_${Date.now()}`,
    }
  }
}

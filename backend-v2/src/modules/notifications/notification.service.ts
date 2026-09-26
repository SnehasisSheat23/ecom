import type {
  NotificationEvent,
  NotificationPayloadMap,
  NotifyOptions,
  AdapterResult,
} from './types.js'
import { NotificationAdapterFactory } from './notification.factory.js'
import { renderEmailTemplate } from './templates/email.templates.js'
import { renderWhatsAppTemplate } from './templates/whatsapp.templates.js'

export class NotificationService {
  private factory: NotificationAdapterFactory

  constructor(factory?: NotificationAdapterFactory) {
    this.factory = factory || new NotificationAdapterFactory()
  }

  /**
   * Fire-and-forget notification dispatch.
   * Dispatches asynchronously in background; never throws or delays the calling function.
   *
   * @example
   * notify('ORDER_PLACED', { orderNumber: '1001', customerName: 'Ahmed', ... })
   */
  notify<E extends NotificationEvent>(
    event: E,
    payload: NotificationPayloadMap[E],
    options: NotifyOptions = {}
  ): void {
    // Non-blocking asynchronous dispatch
    setImmediate(async () => {
      try {
        await this.dispatch(event, payload, options)
      } catch (err) {
        console.error(`[NotificationService:FireAndForget Error for ${event}]:`, err)
      }
    })
  }

  /**
   * Synchronous / Awaited dispatch (when caller explicitly wants to await delivery results).
   */
  async notifySync<E extends NotificationEvent>(
    event: E,
    payload: NotificationPayloadMap[E],
    options: NotifyOptions = {}
  ): Promise<AdapterResult[]> {
    return this.dispatch(event, payload, options)
  }

  private async dispatch<E extends NotificationEvent>(
    event: E,
    payload: NotificationPayloadMap[E],
    options: NotifyOptions
  ): Promise<AdapterResult[]> {
    const results: AdapterResult[] = []
    const targetChannels = options.channels || ['email', 'whatsapp', 'system']

    // 1. Email Channel
    if (targetChannels.includes('email')) {
      const emailMsg = renderEmailTemplate(event, payload)
      if (emailMsg && emailMsg.to) {
        const emailAdapters = this.factory.getAdapters('email')
        for (const adapter of emailAdapters) {
          if (adapter.sendEmail) {
            try {
              const res = await adapter.sendEmail(emailMsg)
              results.push(res)
            } catch (err: any) {
              console.error(`[NotificationService] Error executing ${adapter.name}:`, err)
            }
          }
        }
      }
    }

    // 2. WhatsApp Channel
    if (targetChannels.includes('whatsapp')) {
      const waMsg = renderWhatsAppTemplate(event, payload)
      if (waMsg && waMsg.to) {
        const waAdapters = this.factory.getAdapters('whatsapp')
        for (const adapter of waAdapters) {
          if (adapter.sendWhatsApp) {
            try {
              const res = await adapter.sendWhatsApp(waMsg)
              results.push(res)
            } catch (err: any) {
              console.error(`[NotificationService] Error executing ${adapter.name}:`, err)
            }
          }
        }
      }
    }

    // 3. System / In-App Channel
    if (targetChannels.includes('system')) {
      const systemAdapters = this.factory.getAdapters('system')
      for (const adapter of systemAdapters) {
        if (adapter.sendSystem) {
          try {
            const res = await adapter.sendSystem({
              title: `Event: ${event}`,
              content: `Dispatched ${event}`,
              metadata: payload,
            })
            results.push(res)
          } catch (err: any) {
            console.error(`[NotificationService] Error executing ${adapter.name}:`, err)
          }
        }
      }
    }

    return results
  }
}

// Global Singleton Instance & Convenient Helper Export
export const notificationService = new NotificationService()

/**
 * Clean helper function to trigger notifications from anywhere in fire-and-forget mode!
 *
 * @example
 * notify('ORDER_PLACED', { ... })
 * notify('B2B_QUOTATION_REQUESTED', { ... })
 */
export function notify<E extends NotificationEvent>(
  event: E,
  payload: NotificationPayloadMap[E],
  options?: NotifyOptions
): void {
  notificationService.notify(event, payload, options)
}

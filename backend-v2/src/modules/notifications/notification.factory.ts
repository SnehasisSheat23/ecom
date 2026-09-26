import type { NotificationAdapter, NotificationChannel } from './types.js'
import { EmailAdapter } from './adapters/email.adapter.js'
import { WhatsAppAdapter } from './adapters/whatsapp.adapter.js'
import { SystemAdapter } from './adapters/system.adapter.js'

export class NotificationAdapterFactory {
  private adapters: Map<NotificationChannel, NotificationAdapter[]> = new Map()

  constructor() {
    this.registerDefaultAdapters()
  }

  private registerDefaultAdapters() {
    // Check enabled channels from environment (defaulting to email only if not specified)
    const envChannels = process.env.ENABLED_NOTIFICATION_CHANNELS
      ? process.env.ENABLED_NOTIFICATION_CHANNELS.split(',').map((s) => s.trim().toLowerCase())
      : ['email']

    if (envChannels.includes('email')) {
      this.register(new EmailAdapter())
    }
    if (envChannels.includes('whatsapp')) {
      this.register(new WhatsAppAdapter())
    }
    if (envChannels.includes('system')) {
      this.register(new SystemAdapter())
    }
  }

  public register(adapter: NotificationAdapter) {
    const list = this.adapters.get(adapter.channel) || []
    list.push(adapter)
    this.adapters.set(adapter.channel, list)
  }

  public getAdapters(channel: NotificationChannel): NotificationAdapter[] {
    return this.adapters.get(channel) || []
  }

  public getAllAdapters(): NotificationAdapter[] {
    const all: NotificationAdapter[] = []
    for (const list of this.adapters.values()) {
      all.push(...list)
    }
    return all
  }
}

import type { NotificationAdapter, OutgoingSystemMessage, AdapterResult } from '../types.js'

export class SystemAdapter implements NotificationAdapter {
  readonly channel = 'system'
  readonly name = 'SystemAdapter'

  async sendSystem(msg: OutgoingSystemMessage): Promise<AdapterResult> {
    console.log(`🔔 [SYSTEM NOTIFICATION] ${msg.title} - ${msg.content}`)
    return {
      success: true,
      channel: 'system',
      provider: 'in-app-system',
    }
  }
}

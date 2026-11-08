import type { ClientConfig } from '../config.js'
import type { Notification } from '../notifications/notification.js'
import { providerPost } from './provider-post.js'

export interface NotifyClient {
  send(notification: Notification): Promise<void>
}

export function createNotifyClient(config: ClientConfig): NotifyClient {
  return {
    async send(notification) {
      await providerPost(config, 'notify', notification)
    },
  }
}

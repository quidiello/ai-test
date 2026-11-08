import type { Notification } from '../notifications/notification.js'
import type { ProviderConfig } from '../config.js'
import { ProviderError } from './provider-error.js'

export interface NotifyClient {
  send(notification: Notification): Promise<void>
}

export function createNotifyClient({ baseUrl, apiKey }: ProviderConfig): NotifyClient {
  return {
    async send(notification) {
      const res = await fetch(`${baseUrl}/v1/notify`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      })
      if (!res.ok) throw new ProviderError('notify', res.status)
    },
  }
}

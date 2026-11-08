import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { NotificationDispatcher } from './notifications/dispatcher.js'
import { createAiClient } from './provider/ai-client.js'
import { createNotifyClient } from './provider/notify-client.js'
import { RetryingAiClient } from './provider/retrying-ai-client.js'
import { RequestStore } from './requests/store.js'

const port = 5000
const config = loadConfig()

const aiClient = createAiClient({ ...config.provider, timeoutMs: config.ai.timeoutMs })
const notifyClient = createNotifyClient({ ...config.provider, timeoutMs: config.notify.timeoutMs })

const app = createApp({
  store: new RequestStore(),
  ai: new RetryingAiClient(aiClient, config.ai),
  notifier: new NotificationDispatcher(notifyClient, config.notify),
})

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Notification service listening on port ${info.port}`)
})

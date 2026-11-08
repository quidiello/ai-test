import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createAiClient } from './provider/ai-client.js'
import { createNotifyClient } from './provider/notify-client.js'
import { RequestStore } from './requests/store.js'

const port = 5000
const config = loadConfig()

const app = createApp({
  store: new RequestStore(),
  ai: createAiClient(config.provider),
  notifier: createNotifyClient(config.provider),
})

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Notification service listening on port ${info.port}`)
})

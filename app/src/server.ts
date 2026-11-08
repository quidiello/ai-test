import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { RequestStore } from './requests/store.js'

const port = 5000
const app = createApp(new RequestStore())

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Notification service listening on port ${info.port}`)
})

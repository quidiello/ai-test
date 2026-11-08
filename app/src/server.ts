import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = 5000

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Notification service listening on port ${info.port}`)
})

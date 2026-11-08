import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ProcessDeps } from './requests/process-request.js'
import { requestRoutes } from './requests/routes.js'

export function createApp(deps: ProcessDeps) {
  const app = new Hono()

  app.get('/health', (c) => c.json({ status: 'ok' }))
  app.route('/v1/requests', requestRoutes(deps))

  app.notFound((c) => c.json({ error: 'Not found' }, 404))
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    console.error(err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  return app
}

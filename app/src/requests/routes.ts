import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { startProcessing, type ProcessDeps } from './process-request.js'

const MAX_USER_INPUT_LENGTH = 1000

const createRequestSchema = z.object({
  user_input: z.string().trim().min(1).max(MAX_USER_INPUT_LENGTH),
})

export function requestRoutes(deps: ProcessDeps) {
  const { store } = deps
  const routes = new Hono()

  routes.post(
    '/',
    zValidator('json', createRequestSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: `user_input must be a non-empty string of at most ${MAX_USER_INPUT_LENGTH} characters` }, 422)
      }
    }),
    (c) => {
      const { user_input } = c.req.valid('json')
      const request = store.create(user_input)
      return c.json({ id: request.id }, 201)
    },
  )

  routes.get('/:id', (c) => {
    const request = store.get(c.req.param('id'))
    if (!request) return c.json({ error: 'Request not found' }, 404)
    return c.json({ id: request.id, status: request.status })
  })

  routes.post('/:id/process', (c) => {
    const request = store.get(c.req.param('id'))
    if (!request) return c.json({ error: 'Request not found' }, 404)

    startProcessing(deps, request.id)
    return c.json({ id: request.id, status: request.status }, 202)
  })

  return routes
}

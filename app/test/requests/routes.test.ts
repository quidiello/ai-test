import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { RequestStore } from '../../src/requests/store.js'
import { fakeAi, fakeNotifier, pendingAi, VALID_EXTRACTION } from '../fakes.js'

let app: ReturnType<typeof createApp>

beforeEach(() => {
  app = createApp({ store: new RequestStore(), ai: fakeAi(VALID_EXTRACTION), notifier: fakeNotifier() })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function postJson(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function createRequest(userInput = 'Manda un mail a feda@test.com diciendo hola') {
  const res = await postJson('/v1/requests', { user_input: userInput })
  const { id } = (await res.json()) as { id: string }
  return id
}

describe('POST /v1/requests', () => {
  it('creates a request and returns its id with 201', async () => {
    const res = await postJson('/v1/requests', { user_input: 'Manda un mail a feda@test.com diciendo hola' })

    expect(res.status).toBe(201)
    const body = (await res.json()) as { id: string }
    expect(body.id).toEqual(expect.any(String))
    expect(body.id).not.toBe('')
  })

  it('gives each request a different id', async () => {
    const first = await createRequest()
    const second = await createRequest()

    expect(first).not.toBe(second)
  })

  it('stores the new request as queued', async () => {
    const id = await createRequest()

    const res = await app.request(`/v1/requests/${id}`)

    expect(await res.json()).toEqual({ id, status: 'queued' })
  })

  it('rejects a missing user_input with 422', async () => {
    const res = await postJson('/v1/requests', {})

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: expect.any(String) })
  })

  it('rejects a user_input that is not a string with 422', async () => {
    const res = await postJson('/v1/requests', { user_input: 42 })

    expect(res.status).toBe(422)
  })

  it('rejects a blank user_input with 422', async () => {
    const res = await postJson('/v1/requests', { user_input: '   ' })

    expect(res.status).toBe(422)
  })

  it('rejects a user_input longer than 1000 characters with 422', async () => {
    const res = await postJson('/v1/requests', { user_input: 'a'.repeat(1001) })

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: expect.stringContaining('1000') })
  })

  it('accepts a user_input of exactly 1000 characters', async () => {
    const res = await postJson('/v1/requests', { user_input: 'a'.repeat(1000) })

    expect(res.status).toBe(201)
  })

  it('rejects a malformed JSON body with 400', async () => {
    const res = await postJson('/v1/requests', '{"user_input": ')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: expect.any(String) })
  })
})

describe('GET /v1/requests/:id', () => {
  it('returns the id and status of an existing request', async () => {
    const id = await createRequest()

    const res = await app.request(`/v1/requests/${id}`)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id, status: 'queued' })
  })

  it('returns 404 for an unknown request id', async () => {
    const res = await app.request('/v1/requests/unknown-id')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: expect.any(String) })
  })
})

describe('POST /v1/requests/:id/process', () => {
  it('answers 202 with processing before the AI responds', async () => {
    app = createApp({ store: new RequestStore(), ai: pendingAi(), notifier: fakeNotifier() })
    const id = await createRequest()

    const res = await app.request(`/v1/requests/${id}/process`, { method: 'POST' })

    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ id, status: 'processing' })
  })

  it('reports processing while the request is in progress', async () => {
    app = createApp({ store: new RequestStore(), ai: pendingAi(), notifier: fakeNotifier() })
    const id = await createRequest()
    await app.request(`/v1/requests/${id}/process`, { method: 'POST' })

    const res = await app.request(`/v1/requests/${id}`)

    expect(await res.json()).toEqual({ id, status: 'processing' })
  })

  it('ends as sent once processing finishes', async () => {
    const id = await createRequest()
    await app.request(`/v1/requests/${id}/process`, { method: 'POST' })

    await vi.waitFor(async () => {
      const res = await app.request(`/v1/requests/${id}`)
      expect(await res.json()).toEqual({ id, status: 'sent' })
    })
  })

  it('does not process a request twice', async () => {
    const ai = fakeAi(VALID_EXTRACTION, VALID_EXTRACTION)
    app = createApp({ store: new RequestStore(), ai, notifier: fakeNotifier() })
    const id = await createRequest()

    await app.request(`/v1/requests/${id}/process`, { method: 'POST' })
    const second = await app.request(`/v1/requests/${id}/process`, { method: 'POST' })

    expect(second.status).toBe(202)
    expect(ai.complete).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when processing an unknown request id', async () => {
    const res = await app.request('/v1/requests/unknown-id/process', { method: 'POST' })

    expect(res.status).toBe(404)
  })
})

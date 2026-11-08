import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { RequestStore } from '../src/requests/store.js'

describe('GET /health', () => {
  it('responds 200 with status ok', async () => {
    const app = createApp(new RequestStore())

    const res = await app.request('/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})

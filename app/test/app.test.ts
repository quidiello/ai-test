import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { RequestStore } from '../src/requests/store.js'
import { fakeAi, fakeNotifier } from './fakes.js'

describe('GET /health', () => {
  it('responds 200 with status ok', async () => {
    const app = createApp({ store: new RequestStore(), ai: fakeAi(), notifier: fakeNotifier() })

    const res = await app.request('/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})

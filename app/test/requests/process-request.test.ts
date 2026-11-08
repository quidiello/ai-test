import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderError } from '../../src/provider/provider-error.js'
import { processRequest } from '../../src/requests/process-request.js'
import { RequestStore } from '../../src/requests/store.js'
import { failingAi, failingNotifier, fakeAi, fakeNotifier, VALID_EXTRACTION } from '../fakes.js'

let store: RequestStore

beforeEach(() => {
  store = new RequestStore()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('processRequest', () => {
  it('marks the request as sent when extraction and notification succeed', async () => {
    const { id } = store.create('Manda un mail a feda@test.com diciendo hola')
    const notifier = fakeNotifier()

    await processRequest({ store, ai: fakeAi(VALID_EXTRACTION), notifier }, id)

    expect(store.get(id)?.status).toBe('sent')
    expect(notifier.send).toHaveBeenCalledWith({ to: 'feda@test.com', message: 'hola', type: 'email' })
  })

  it('marks the request as failed without notifying when the AI response is invalid', async () => {
    const { id } = store.create('Manda un mail a feda@test.com diciendo hola')
    const notifier = fakeNotifier()

    await processRequest({ store, ai: fakeAi('Refused: Content analysis flagged sensitive information.'), notifier }, id)

    expect(store.get(id)?.status).toBe('failed')
    expect(notifier.send).not.toHaveBeenCalled()
  })

  it('marks the request as failed when the AI provider errors', async () => {
    const { id } = store.create('Manda un mail a feda@test.com diciendo hola')

    await processRequest({ store, ai: failingAi(new ProviderError('ai/extract', 500)), notifier: fakeNotifier() }, id)

    expect(store.get(id)?.status).toBe('failed')
  })

  it('marks the request as failed when the notify provider rejects it', async () => {
    const { id } = store.create('Manda un mail a feda@test.com diciendo hola')
    const notifier = failingNotifier(new ProviderError('notify', 429))

    await processRequest({ store, ai: fakeAi(VALID_EXTRACTION), notifier }, id)

    expect(store.get(id)?.status).toBe('failed')
  })

  it('logs the reason when a request fails', async () => {
    const { id } = store.create('Manda un mail a feda@test.com diciendo hola')

    await processRequest({ store, ai: fakeAi(VALID_EXTRACTION), notifier: failingNotifier(new ProviderError('notify', 429)) }, id)

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('notify responded 429'))
  })
})

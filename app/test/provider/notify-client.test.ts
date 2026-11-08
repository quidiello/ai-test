import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNotifyClient } from '../../src/provider/notify-client.js'
import { ProviderError, ProviderTimeoutError } from '../../src/provider/provider-error.js'
import { stubHangingFetch } from '../fakes.js'

const config = { baseUrl: 'http://provider.test', apiKey: 'secret-key', timeoutMs: 1000 }
const notification = { to: 'feda@test.com', message: 'hola', type: 'email' as const }

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Notify client', () => {
  it('posts the notification to the notify endpoint with the API key', async () => {
    const fetchMock = stubFetch(Response.json({ status: 'delivered', provider_id: 'p-1234' }))

    await createNotifyClient(config).send(notification)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://provider.test/v1/notify')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'X-API-Key': 'secret-key', 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual(notification)
  })

  it('throws a provider error with the status when the provider rate limits', async () => {
    stubFetch(Response.json({ detail: 'Rate limit exceeded' }, { status: 429 }))

    const call = createNotifyClient(config).send(notification)

    await expect(call).rejects.toBeInstanceOf(ProviderError)
    await expect(call).rejects.toMatchObject({ status: 429 })
  })

  it('fails with a timeout error when the notify provider does not answer in time', async () => {
    stubHangingFetch()

    const call = createNotifyClient({ ...config, timeoutMs: 20 }).send(notification)

    await expect(call).rejects.toBeInstanceOf(ProviderTimeoutError)
    await expect(call).rejects.toThrow('notify timed out after 20 ms')
  })
})

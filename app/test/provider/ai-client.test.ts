import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAiClient } from '../../src/provider/ai-client.js'
import { ProviderError } from '../../src/provider/provider-error.js'

const config = { baseUrl: 'http://provider.test', apiKey: 'secret-key' }

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function completion(content: string) {
  return Response.json({ choices: [{ index: 0, message: { role: 'assistant', content } }] })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AI client', () => {
  it('posts the messages to the extract endpoint with the API key', async () => {
    const fetchMock = stubFetch(completion('{}'))
    const messages = [
      { role: 'system' as const, content: 'You are an extractor.' },
      { role: 'user' as const, content: 'Send email to test@test.com' },
    ]

    await createAiClient(config).complete(messages)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://provider.test/v1/ai/extract')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'X-API-Key': 'secret-key', 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ messages })
  })

  it('returns the content of the first choice', async () => {
    stubFetch(completion('{"to": "a@b.com"}'))

    const content = await createAiClient(config).complete([{ role: 'user', content: 'hi' }])

    expect(content).toBe('{"to": "a@b.com"}')
  })

  it('throws a provider error with the status when the response is not successful', async () => {
    stubFetch(Response.json({ detail: 'Invalid API Key' }, { status: 401 }))

    const call = createAiClient(config).complete([{ role: 'user', content: 'hi' }])

    await expect(call).rejects.toBeInstanceOf(ProviderError)
    await expect(call).rejects.toMatchObject({ status: 401 })
  })
})

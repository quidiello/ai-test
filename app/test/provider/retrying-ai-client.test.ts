import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../../src/provider/ai-client.js'
import { ProviderError, ProviderNetworkError, ProviderTimeoutError } from '../../src/provider/provider-error.js'
import { RetryingAiClient } from '../../src/provider/retrying-ai-client.js'
import { fakeAi } from '../fakes.js'

const messages: ChatMessage[] = [{ role: 'user', content: 'Manda un mail a feda@test.com diciendo hola' }]
const ANSWER = '{"to": "feda@test.com"}'
const options = { maxAttempts: 3, retryBaseDelayMs: 500 }

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('RetryingAiClient', () => {
  it('returns the answer without retrying when the call succeeds', async () => {
    const ai = fakeAi(ANSWER)

    const answer = await new RetryingAiClient(ai, options).complete(messages)

    expect(answer).toBe(ANSWER)
    expect(ai.complete).toHaveBeenCalledTimes(1)
  })

  it('retries a 500 from the AI and returns the answer', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValueOnce(new ProviderError('ai/extract', 500)).mockResolvedValue(ANSWER)

    const answer = new RetryingAiClient(ai, options).complete(messages)
    await vi.advanceTimersByTimeAsync(500)

    await expect(answer).resolves.toBe(ANSWER)
    expect(ai.complete).toHaveBeenCalledTimes(2)
  })

  it('retries a timeout', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValueOnce(new ProviderTimeoutError('ai/extract', 10000)).mockResolvedValue(ANSWER)

    const answer = new RetryingAiClient(ai, options).complete(messages)
    await vi.advanceTimersByTimeAsync(500)

    await expect(answer).resolves.toBe(ANSWER)
  })

  it('sends the same messages on each attempt', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValueOnce(new ProviderNetworkError('ai/extract', new TypeError('fetch failed'))).mockResolvedValue(ANSWER)

    const answer = new RetryingAiClient(ai, options).complete(messages)
    await vi.advanceTimersByTimeAsync(500)
    await answer

    expect(ai.complete.mock.calls[1][0]).toEqual(messages)
  })

  it('waits longer before each new attempt', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValue(new ProviderError('ai/extract', 503))

    void new RetryingAiClient(ai, options).complete(messages).catch(() => {})
    await vi.advanceTimersByTimeAsync(499)
    expect(ai.complete).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(ai.complete).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(999)
    expect(ai.complete).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    expect(ai.complete).toHaveBeenCalledTimes(3)
  })

  it('gives up after the maximum number of attempts', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValue(new ProviderError('ai/extract', 500))

    const answer = new RetryingAiClient(ai, options).complete(messages)
    const outcome = expect(answer).rejects.toMatchObject({ status: 500 })
    await vi.advanceTimersByTimeAsync(10_000)

    await outcome
    expect(ai.complete).toHaveBeenCalledTimes(3)
  })

  it('does not retry an error that would repeat, like a 401', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValue(new ProviderError('ai/extract', 401))

    const answer = new RetryingAiClient(ai, options).complete(messages)
    const outcome = expect(answer).rejects.toMatchObject({ status: 401 })
    await vi.advanceTimersByTimeAsync(10_000)

    await outcome
    expect(ai.complete).toHaveBeenCalledTimes(1)
  })

  it('does not retry an unexpected error, like a malformed answer', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValue(new SyntaxError('Unexpected token < in JSON'))

    const answer = new RetryingAiClient(ai, options).complete(messages)
    const outcome = expect(answer).rejects.toBeInstanceOf(SyntaxError)
    await vi.advanceTimersByTimeAsync(10_000)

    await outcome
    expect(ai.complete).toHaveBeenCalledTimes(1)
  })

  it('logs the reason of each retry', async () => {
    const ai = fakeAi()
    ai.complete.mockRejectedValueOnce(new ProviderError('ai/extract', 500)).mockResolvedValue(ANSWER)

    const answer = new RetryingAiClient(ai, options).complete(messages)
    await vi.advanceTimersByTimeAsync(500)
    await answer

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('ai/extract responded 500'))
  })
})

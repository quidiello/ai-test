import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationDispatcher } from '../../src/notifications/dispatcher.js'
import { ProviderError } from '../../src/provider/provider-error.js'
import { fakeNotifier } from '../fakes.js'

const notification = { to: 'feda@test.com', message: 'hola', type: 'email' as const }
const options = { ratePerSecond: 5, maxAttempts: 3, retryBaseDelayMs: 1000 }

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('NotificationDispatcher', () => {
  it('sends a notification right away when the queue is empty', async () => {
    const notifier = fakeNotifier()
    const dispatcher = new NotificationDispatcher(notifier, options)

    const sent = dispatcher.send(notification)
    await vi.advanceTimersByTimeAsync(0)

    await expect(sent).resolves.toBeUndefined()
    expect(notifier.send).toHaveBeenCalledWith(notification)
  })

  it('sends at most the configured number of notifications per second', async () => {
    const notifier = fakeNotifier()
    const dispatcher = new NotificationDispatcher(notifier, options)

    for (let i = 0; i < 12; i++) void dispatcher.send(notification)

    await vi.advanceTimersByTimeAsync(999)
    expect(notifier.send).toHaveBeenCalledTimes(5)

    await vi.advanceTimersByTimeAsync(1000)
    expect(notifier.send).toHaveBeenCalledTimes(10)
  })

  it('retries a notification rejected with 429 and resolves once sent', async () => {
    const notifier = fakeNotifier()
    notifier.send.mockRejectedValueOnce(new ProviderError('notify', 429))
    const dispatcher = new NotificationDispatcher(notifier, options)

    const sent = dispatcher.send(notification)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(sent).resolves.toBeUndefined()
    expect(notifier.send).toHaveBeenCalledTimes(2)
  })

  it('waits longer before each new attempt', async () => {
    const notifier = fakeNotifier()
    notifier.send.mockRejectedValue(new ProviderError('notify', 500))
    const dispatcher = new NotificationDispatcher(notifier, options)

    void dispatcher.send(notification).catch(() => {})
    await vi.advanceTimersByTimeAsync(999)
    expect(notifier.send).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(notifier.send).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1999)
    expect(notifier.send).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(1)
    expect(notifier.send).toHaveBeenCalledTimes(3)
  })

  it('retries after a network error', async () => {
    const notifier = fakeNotifier()
    notifier.send.mockRejectedValueOnce(new TypeError('fetch failed'))
    const dispatcher = new NotificationDispatcher(notifier, options)

    const sent = dispatcher.send(notification)
    await vi.advanceTimersByTimeAsync(1000)

    await expect(sent).resolves.toBeUndefined()
  })

  it('gives up after the maximum number of attempts', async () => {
    const notifier = fakeNotifier()
    notifier.send.mockRejectedValue(new ProviderError('notify', 429))
    const dispatcher = new NotificationDispatcher(notifier, options)

    const sent = dispatcher.send(notification)
    const outcome = expect(sent).rejects.toMatchObject({ status: 429 })
    await vi.advanceTimersByTimeAsync(10_000)

    await outcome
    expect(notifier.send).toHaveBeenCalledTimes(3)
  })

  it('does not retry an error that would repeat, like a 401', async () => {
    const notifier = fakeNotifier()
    notifier.send.mockRejectedValue(new ProviderError('notify', 401))
    const dispatcher = new NotificationDispatcher(notifier, options)

    const sent = dispatcher.send(notification)
    const outcome = expect(sent).rejects.toMatchObject({ status: 401 })
    await vi.advanceTimersByTimeAsync(10_000)

    await outcome
    expect(notifier.send).toHaveBeenCalledTimes(1)
  })

  it('sends a retried notification before the ones still waiting', async () => {
    const notifier = fakeNotifier()
    notifier.send.mockRejectedValueOnce(new ProviderError('notify', 429))
    const dispatcher = new NotificationDispatcher(notifier, { ...options, retryBaseDelayMs: 300 })
    const first = { ...notification, message: 'first' }

    void dispatcher.send(first)
    for (let i = 0; i < 5; i++) void dispatcher.send({ ...notification, message: `later ${i}` })
    await vi.advanceTimersByTimeAsync(400)

    const sentMessages = notifier.send.mock.calls.map(([n]) => n.message)
    expect(sentMessages.slice(0, 3)).toEqual(['first', 'later 0', 'first'])
  })
})

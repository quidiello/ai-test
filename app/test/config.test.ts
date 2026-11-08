import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadConfig } from '../src/config.js'

beforeEach(() => {
  vi.stubEnv('PROVIDER_URL', 'http://provider.test')
  vi.stubEnv('PROVIDER_API_KEY', 'secret-key')
  vi.stubEnv('NOTIFY_RATE_PER_SECOND', '5')
  vi.stubEnv('AI_TIMEOUT_MS', '10000')
  vi.stubEnv('NOTIFY_TIMEOUT_MS', '5000')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('loadConfig', () => {
  it('reads the provider URL and API key from the environment', () => {
    expect(loadConfig().provider).toEqual({ baseUrl: 'http://provider.test', apiKey: 'secret-key' })
  })

  it('reads the notification rate from the environment', () => {
    expect(loadConfig().notify.ratePerSecond).toBe(5)
  })

  it('reads the AI and notify timeouts from the environment', () => {
    const config = loadConfig()

    expect(config.ai.timeoutMs).toBe(10000)
    expect(config.notify.timeoutMs).toBe(5000)
  })

  it.each(['AI_TIMEOUT_MS', 'NOTIFY_TIMEOUT_MS'])('fails when %s is not a positive number', (name) => {
    vi.stubEnv(name, '0')

    expect(() => loadConfig()).toThrow(name)
  })

  it('fails naming the variable when the provider URL is missing', () => {
    vi.stubEnv('PROVIDER_URL', undefined)

    expect(() => loadConfig()).toThrow('PROVIDER_URL')
  })

  it('fails naming the variable when the API key is empty', () => {
    vi.stubEnv('PROVIDER_API_KEY', '')

    expect(() => loadConfig()).toThrow('PROVIDER_API_KEY')
  })

  it.each(['abc', '0', '-1'])('fails when the notification rate is %s', (value) => {
    vi.stubEnv('NOTIFY_RATE_PER_SECOND', value)

    expect(() => loadConfig()).toThrow('NOTIFY_RATE_PER_SECOND')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadConfig } from '../src/config.js'

beforeEach(() => {
  vi.stubEnv('PROVIDER_URL', 'http://provider.test')
  vi.stubEnv('PROVIDER_API_KEY', 'secret-key')
  vi.stubEnv('NOTIFY_RATE_PER_SECOND', '5')
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

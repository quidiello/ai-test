import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadConfig } from '../src/config.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('loadConfig', () => {
  it('reads the provider URL and API key from the environment', () => {
    vi.stubEnv('PROVIDER_URL', 'http://provider.test')
    vi.stubEnv('PROVIDER_API_KEY', 'secret-key')

    expect(loadConfig().provider).toEqual({ baseUrl: 'http://provider.test', apiKey: 'secret-key' })
  })

  it('fails naming the variable when the provider URL is missing', () => {
    vi.stubEnv('PROVIDER_URL', undefined)
    vi.stubEnv('PROVIDER_API_KEY', 'secret-key')

    expect(() => loadConfig()).toThrow('PROVIDER_URL')
  })

  it('fails naming the variable when the API key is empty', () => {
    vi.stubEnv('PROVIDER_URL', 'http://provider.test')
    vi.stubEnv('PROVIDER_API_KEY', '')

    expect(() => loadConfig()).toThrow('PROVIDER_API_KEY')
  })
})

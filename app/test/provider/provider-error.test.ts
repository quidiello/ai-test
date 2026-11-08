import { describe, expect, it } from 'vitest'
import {
  isTransientError,
  ProviderError,
  ProviderNetworkError,
  ProviderResponseError,
  ProviderTimeoutError,
} from '../../src/provider/provider-error.js'

describe('isTransientError', () => {
  it.each([429, 500, 503])('treats a %s from the provider as transient', (status) => {
    expect(isTransientError(new ProviderError('notify', status))).toBe(true)
  })

  it.each([400, 401, 404, 422])('does not treat a %s from the provider as transient', (status) => {
    expect(isTransientError(new ProviderError('notify', status))).toBe(false)
  })

  it('treats a timeout as transient', () => {
    expect(isTransientError(new ProviderTimeoutError('notify', 5000))).toBe(true)
  })

  it('treats a network error as transient', () => {
    expect(isTransientError(new ProviderNetworkError('notify', new TypeError('fetch failed')))).toBe(true)
  })

  it('does not treat an unexpected response as transient', () => {
    expect(isTransientError(new ProviderResponseError('ai/extract'))).toBe(false)
  })

  it('does not treat other errors as transient', () => {
    expect(isTransientError(new TypeError("Cannot read properties of undefined (reading '0')"))).toBe(false)
    expect(isTransientError(new SyntaxError('Unexpected token < in JSON'))).toBe(false)
  })
})

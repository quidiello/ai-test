import { describe, expect, it } from 'vitest'
import { errorMessage } from '../src/error-message.js'

describe('errorMessage', () => {
  it('returns the message of an Error', () => {
    expect(errorMessage(new TypeError('fetch failed'))).toBe('fetch failed')
  })

  it('returns anything else as text', () => {
    expect(errorMessage('timeout')).toBe('timeout')
    expect(errorMessage(42)).toBe('42')
  })
})

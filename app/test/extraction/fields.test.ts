import { describe, expect, it } from 'vitest'
import { normalizeFields } from '../../src/extraction/fields.js'

describe('normalizeFields', () => {
  it('keeps the standard keys', () => {
    expect(normalizeFields({ to: 'a@b.com', message: 'hola', type: 'email' })).toEqual({
      to: 'a@b.com',
      message: 'hola',
      type: 'email',
    })
  })

  it('maps capitalized keys', () => {
    expect(normalizeFields({ To: 'a@b.com', Message: 'hola', Type: 'email' })).toEqual({
      to: 'a@b.com',
      message: 'hola',
      type: 'email',
    })
  })

  it('maps recipient, body and channel aliases', () => {
    expect(normalizeFields({ Recipient: 'a@b.com', body: 'hola', channel: 'email' })).toEqual({
      to: 'a@b.com',
      message: 'hola',
      type: 'email',
    })
  })

  it('maps destination, text and method aliases', () => {
    expect(normalizeFields({ destination: 'a@b.com', text: 'hola', method: 'email' })).toEqual({
      to: 'a@b.com',
      message: 'hola',
      type: 'email',
    })
  })

  it('drops unknown keys', () => {
    expect(normalizeFields({ to: 'a@b.com', message: 'hola', type: 'email', confidence: 0.99, latency_ms: 120 })).toEqual({
      to: 'a@b.com',
      message: 'hola',
      type: 'email',
    })
  })

  it('trims values and lowercases the type', () => {
    expect(normalizeFields({ to: ' a@b.com ', message: ' hola ', type: 'SMS' })).toEqual({
      to: 'a@b.com',
      message: 'hola',
      type: 'sms',
    })
  })

  it('leaves out fields that are missing, empty or not strings', () => {
    expect(normalizeFields({ to: 42, message: '  ' })).toEqual({})
  })
})

import { describe, expect, it } from 'vitest'
import { CutOffJsonError, parseLenientJson } from '../../src/extraction/json-repair.js'

const expected = { to: 'a@b.com', message: 'hola', type: 'email' }

describe('parseLenientJson', () => {
  it('parses valid JSON as is', () => {
    expect(parseLenientJson('{"to": "a@b.com", "message": "hola", "type": "email"}')).toEqual(expected)
  })

  it('closes an object truncated with an ellipsis', () => {
    expect(parseLenientJson('{"to": "a@b.com", "message": "hola", "type": "email" ...')).toEqual(expected)
  })

  it('accepts single-quoted keys and values', () => {
    expect(parseLenientJson("{'to': 'a@b.com', 'message': 'hola', 'type': 'email'}")).toEqual(expected)
  })

  it('accepts unquoted keys', () => {
    expect(parseLenientJson('{to: "a@b.com", message: "hola", type: "email"}')).toEqual(expected)
  })

  it('does not touch colons and commas inside string values', () => {
    expect(parseLenientJson('{to: "a@b.com", message: "cita a las 10:00, puerta: B", type: "email"}')).toEqual({
      ...expected,
      message: 'cita a las 10:00, puerta: B',
    })
  })

  it('drops a trailing comma', () => {
    expect(parseLenientJson('{"to": "a@b.com", "message": "hola", "type": "email",}')).toEqual(expected)
  })

  it('does not repair a value that was cut off', () => {
    expect(() => parseLenientJson('{"to": "a@b.com", "message": "Tu pedido ha sal')).toThrow(CutOffJsonError)
  })

  it('throws when the text cannot be repaired', () => {
    expect(() => parseLenientJson('{"to": : }')).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { findJsonCandidate } from '../../src/extraction/json-candidate.js'

describe('findJsonCandidate', () => {
  it('returns a bare JSON object unchanged', () => {
    expect(findJsonCandidate('{"to": "a@b.com"}')).toBe('{"to": "a@b.com"}')
  })

  it('takes the content of a json code block', () => {
    const text = 'He extraído la información:\n```json\n{"to": "a@b.com"}\n```'

    expect(findJsonCandidate(text)).toBe('{"to": "a@b.com"}')
  })

  it('takes the content of a code block without language', () => {
    const text = 'Output:\n```\n{"to": "a@b.com"}\n```'

    expect(findJsonCandidate(text)).toBe('{"to": "a@b.com"}')
  })

  it('takes the object embedded in surrounding text', () => {
    const text = 'Claro, enviaré hola por email. En formato JSON: {"to": "a@b.com"} Saludos.'

    expect(findJsonCandidate(text)).toBe('{"to": "a@b.com"}')
  })

  it('takes everything from the opening brace when the object is not closed', () => {
    expect(findJsonCandidate('{"to": "a@b.com", "type": "email" ...')).toBe('{"to": "a@b.com", "type": "email" ...')
  })

  it('ignores text with braces after the object', () => {
    const text = '{"to": "a@b.com", "message": "hola"} (formato {to, message})'

    expect(findJsonCandidate(text)).toBe('{"to": "a@b.com", "message": "hola"}')
  })

  it('takes only the first object when there are two', () => {
    expect(findJsonCandidate('{"to": "a@b.com"} o bien {"to": "c@d.com"}')).toBe('{"to": "a@b.com"}')
  })

  it('does not count braces inside string values', () => {
    const text = '{"to": "a@b.com", "message": "usa {nombre} y }"} fin'

    expect(findJsonCandidate(text)).toBe('{"to": "a@b.com", "message": "usa {nombre} y }"}')
  })

  it('keeps nested objects whole', () => {
    expect(findJsonCandidate('Resultado: {"a": {"b": 1}} listo')).toBe('{"a": {"b": 1}}')
  })

  it('returns undefined when the text has no object', () => {
    expect(findJsonCandidate('Refused: Content analysis flagged sensitive information.')).toBeUndefined()
  })
})

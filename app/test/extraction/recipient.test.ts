import { describe, expect, it } from 'vitest'
import { channelOf, findRecipients, isMentionedIn } from '../../src/extraction/recipient.js'

describe('channelOf', () => {
  it('returns email for an email address', () => {
    expect(channelOf('juan@example.com')).toBe('email')
  })

  it('returns sms for a phone number with or without dashes', () => {
    expect(channelOf('600-111-222')).toBe('sms')
    expect(channelOf('699888777')).toBe('sms')
    expect(channelOf('+34 699 888 777')).toBe('sms')
  })

  it('returns undefined for anything else', () => {
    expect(channelOf('juan')).toBeUndefined()
    expect(channelOf('10:00')).toBeUndefined()
  })
})

describe('findRecipients', () => {
  it('finds an email address at the end of a sentence', () => {
    expect(findRecipients('Enviar email a juan@example.com.')).toEqual(['juan@example.com'])
  })

  it('finds a phone number but not a time', () => {
    expect(findRecipients('Recordatorio por teléfono al 699888777: cita a las 10:00')).toEqual(['699888777'])
  })

  it('returns every recipient in the text', () => {
    expect(findRecipients('Manda a juan@example.com y al 600-111-222')).toEqual(['juan@example.com', '600-111-222'])
  })
})

describe('isMentionedIn', () => {
  it('matches an email address ignoring case', () => {
    expect(isMentionedIn('juan@example.com', 'Enviar email a Juan@Example.com')).toBe(true)
  })

  it('matches a phone number ignoring separators', () => {
    expect(isMentionedIn('600111222', 'Avisar por SMS al 600-111-222')).toBe(true)
  })

  it('matches a phone number written with a country prefix', () => {
    expect(isMentionedIn('+34 600 111 222', 'Avisar por SMS al 600-111-222')).toBe(true)
  })

  it('matches a phone number written without the country prefix the user used', () => {
    expect(isMentionedIn('600111222', 'Avisar por SMS al +34 600 111 222')).toBe(true)
  })

  it('rejects a different phone number with the same country prefix', () => {
    expect(isMentionedIn('+34 600 111 333', 'Avisar por SMS al 600-111-222')).toBe(false)
  })

  it('rejects a recipient that is not in the text', () => {
    expect(isMentionedIn('otro@example.com', 'Enviar email a juan@example.com')).toBe(false)
    expect(isMentionedIn('600111333', 'Avisar por SMS al 600-111-222')).toBe(false)
  })
})

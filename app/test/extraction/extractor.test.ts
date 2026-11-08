import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtractionError, extractNotification } from '../../src/extraction/extractor.js'
import { fakeAi, VALID_EXTRACTION } from '../fakes.js'

const USER_INPUT = 'Manda un mail a feda@test.com diciendo hola'
const EXPECTED = { to: 'feda@test.com', message: 'hola', type: 'email' }
const REFUSAL = 'Refused: Content analysis flagged sensitive information.'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('extractNotification retries', () => {
  it('retries once when the AI refuses and returns the second answer', async () => {
    const ai = fakeAi(REFUSAL, VALID_EXTRACTION)

    const notification = await extractNotification(ai, USER_INPUT)

    expect(notification).toEqual(EXPECTED)
    expect(ai.complete).toHaveBeenCalledTimes(2)
  })

  it('gives up after a second unusable answer', async () => {
    const ai = fakeAi(REFUSAL, REFUSAL)

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('no JSON found')
    expect(ai.complete).toHaveBeenCalledTimes(2)
  })

  it('retries when the AI omits the recipient instead of taking it from the user input', async () => {
    const ai = fakeAi('{"message": "hola", "type": "email"}', VALID_EXTRACTION)

    const notification = await extractNotification(ai, USER_INPUT)

    expect(notification).toEqual(EXPECTED)
    expect(ai.complete).toHaveBeenCalledTimes(2)
  })

  it('rejects without retrying when the AI reports an error', async () => {
    const ai = fakeAi('{"error": "missing_recipient"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('AI reported missing_recipient')
    expect(ai.complete).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['no JSON', REFUSAL, 'not a valid JSON object'],
    ['a value cut off', '{"to": "feda@test.com", "message": "ho', 'was cut off before the end'],
    ['no recipient', '{"message": "hola", "type": "email"}', 'had no "to"'],
    ['a recipient that is not an email or phone', '{"to": "feda", "message": "hola", "type": "email"}', 'was not an email address or a phone number'],
    ['a recipient not in the message', '{"to": "otro@test.com", "message": "hola", "type": "email"}', 'does not appear in the message'],
    ['a type that does not match the recipient', '{"to": "feda@test.com", "message": "hola", "type": "sms"}', '"type" did not match the recipient'],
    ['no message', '{"to": "feda@test.com", "type": "email"}', 'had no "message"'],
  ])('tells the AI what was wrong on the retry when the answer has %s', async (_case, response, hint) => {
    const ai = fakeAi(response, VALID_EXTRACTION)

    await extractNotification(ai, USER_INPUT)

    const [first] = ai.complete.mock.calls[0]
    const [retry] = ai.complete.mock.calls[1]
    expect(first[0].content).not.toContain(hint)
    expect(retry[0].content).toContain(hint)
  })

  it('adds a correction to the system prompt on the retry', async () => {
    const ai = fakeAi(REFUSAL, VALID_EXTRACTION)

    await extractNotification(ai, USER_INPUT)

    const [first] = ai.complete.mock.calls[0]
    const [retry] = ai.complete.mock.calls[1]
    expect(retry[0].role).toBe('system')
    expect(retry[0].content.startsWith(first[0].content)).toBe(true)
    expect(retry[0].content.length).toBeGreaterThan(first[0].content.length)
  })

  it('sends the user input unchanged on the retry', async () => {
    const ai = fakeAi(REFUSAL, VALID_EXTRACTION)

    await extractNotification(ai, USER_INPUT)

    const [retry] = ai.complete.mock.calls[1]
    expect(retry).toHaveLength(2)
    expect(retry[1]).toEqual({ role: 'user', content: USER_INPUT })
  })

  it('logs the reason of each retry', async () => {
    await extractNotification(fakeAi(REFUSAL, VALID_EXTRACTION), USER_INPUT)

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no JSON found'))
  })
})

describe('extractNotification', () => {
  it('sends a system prompt followed by the user input as is', async () => {
    const ai = fakeAi(VALID_EXTRACTION)

    await extractNotification(ai, USER_INPUT)

    const [messages] = ai.complete.mock.calls[0]
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).not.toBe('')
    expect(messages[1]).toEqual({ role: 'user', content: USER_INPUT })
  })

  describe('recovers the notification from the responses the AI engine is known to produce', () => {
    it.each([
      ['clean JSON', '{"to": "feda@test.com", "message": "hola", "type": "email"}'],
      ['Recipient, body and channel keys', '{"Recipient": "feda@test.com", "body": "hola", "channel": "email"}'],
      ['capitalized keys', '{"To": "feda@test.com", "Message": "hola", "Type": "email"}'],
      ['destination, text and method keys', '{"destination": "feda@test.com", "text": "hola", "method": "email"}'],
      ['extra fields', '{"to": "feda@test.com", "message": "hola", "type": "email", "confidence": 0.99, "latency_ms": 120}'],
      ['missing type', '{"to": "feda@test.com", "message": "hola"}'],
      ['a json code block', 'He extraído la información correctamente:\n```json\n{"to": "feda@test.com", "message": "hola", "type": "email"}\n```'],
      ['a plain code block', 'Output:\n```\n{"to": "feda@test.com", "message": "hola", "type": "email"}\n```'],
      ['JSON embedded in text', 'Claro, el destino es feda@test.com y enviaré hola por email. En formato JSON: {"to": "feda@test.com", "message": "hola", "type": "email"}'],
      ['truncated JSON', '{"to": "feda@test.com", "message": "hola", "type": "email" ...'],
      ['single quotes', "{'to': 'feda@test.com', 'message': 'hola', 'type': 'email'}"],
      ['unquoted keys', '{to: "feda@test.com", message: "hola", type: "email"}'],
    ])('from %s', async (_variant, response) => {
      const notification = await extractNotification(fakeAi(response), USER_INPUT)

      expect(notification).toEqual(EXPECTED)
    })
  })

  describe('rejects the refusals the AI engine is known to produce', () => {
    it.each([
      'Lo siento, como IA no tengo permitido procesar datos de contacto personales.',
      'Error: El contenido del mensaje viola las políticas de seguridad (Potential Spam).',
      'Refused: Content analysis flagged sensitive information.',
    ])('%s', async (response) => {
      await expect(extractNotification(fakeAi(response), USER_INPUT)).rejects.toThrow('no JSON found')
    })
  })

  it('infers sms from a phone number when the type is missing', async () => {
    const notification = await extractNotification(
      fakeAi('{"to": "600-111-222", "message": "reserva confirmada"}'),
      'Avisar por SMS al 600-111-222 que la reserva ha sido confirmada.',
    )

    expect(notification).toEqual({ to: '600-111-222', message: 'reserva confirmada', type: 'sms' })
  })

  it('rejects a recipient that does not appear in the user input', async () => {
    const ai = fakeAi('{"to": "otro@test.com", "message": "hola", "type": "email"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('recipient not in user input')
  })

  it('rejects a response without a recipient', async () => {
    const ai = fakeAi('{"message": "hola", "type": "email"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('missing recipient')
  })

  it('rejects a type that does not match the recipient', async () => {
    const ai = fakeAi('{"to": "feda@test.com", "message": "hola", "type": "sms"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('type does not match recipient')
  })

  it('rejects an unsupported notification type', async () => {
    const ai = fakeAi('{"to": "feda@test.com", "message": "hola", "type": "whatsapp"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('type does not match recipient')
  })

  it('rejects a response without a message', async () => {
    const ai = fakeAi('{"to": "feda@test.com", "type": "email"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('missing message')
  })

  it('rejects an answer that was cut off in the middle of a value', async () => {
    const ai = fakeAi('{"to": "feda@test.com", "message": "ho')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toThrow('answer was cut off')
  })

  it('rejects JSON that cannot be repaired', async () => {
    const ai = fakeAi('{"to": : }')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })

  it('rejects JSON that is not an object', async () => {
    const ai = fakeAi('Resultado: {} ')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })
})

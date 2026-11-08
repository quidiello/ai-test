import { describe, expect, it } from 'vitest'
import { ExtractionError, extractNotification } from '../../src/extraction/extractor.js'
import { fakeAi, VALID_EXTRACTION } from '../fakes.js'

const USER_INPUT = 'Manda un mail a feda@test.com diciendo hola'
const EXPECTED = { to: 'feda@test.com', message: 'hola', type: 'email' }

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
      ['missing recipient', '{"message": "hola", "type": "email"}'],
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

  it('rejects a missing recipient when the user input has more than one', async () => {
    const ai = fakeAi('{"message": "hola", "type": "email"}')

    await expect(extractNotification(ai, 'Manda un mail a feda@test.com y a otro@test.com')).rejects.toThrow(
      'ambiguous recipient',
    )
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

  it('rejects JSON that cannot be repaired', async () => {
    const ai = fakeAi('{"to": : }')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })

  it('rejects JSON that is not an object', async () => {
    const ai = fakeAi('Resultado: {} ')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })
})

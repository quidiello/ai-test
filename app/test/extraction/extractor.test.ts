import { describe, expect, it } from 'vitest'
import { ExtractionError, extractNotification } from '../../src/extraction/extractor.js'
import { fakeAi, VALID_EXTRACTION } from '../fakes.js'

const USER_INPUT = 'Manda un mail a feda@test.com diciendo hola'

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

  it('returns the notification from a clean JSON response', async () => {
    const ai = fakeAi(VALID_EXTRACTION)

    const notification = await extractNotification(ai, USER_INPUT)

    expect(notification).toEqual({ to: 'feda@test.com', message: 'hola', type: 'email' })
  })

  it('rejects a response that is not JSON', async () => {
    const ai = fakeAi('Lo siento, como IA no tengo permitido procesar datos de contacto personales.')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })

  it('rejects a response with a missing field', async () => {
    const ai = fakeAi('{"to": "feda@test.com", "message": "hola"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })

  it('rejects a response with an unsupported notification type', async () => {
    const ai = fakeAi('{"to": "feda@test.com", "message": "hola", "type": "whatsapp"}')

    await expect(extractNotification(ai, USER_INPUT)).rejects.toBeInstanceOf(ExtractionError)
  })
})

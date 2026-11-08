import { notificationSchema, type Notification } from '../notifications/notification.js'
import type { AiClient } from '../provider/ai-client.js'

const SYSTEM_PROMPT = `Extract the notification the user wants to send.
Respond only with a JSON object with these fields:
- "to": the email address or phone number of the recipient
- "message": the text to send
- "type": "email" or "sms"`

export class ExtractionError extends Error {
  constructor(reason: string) {
    super(`invalid AI response: ${reason}`)
    this.name = 'ExtractionError'
  }
}

export async function extractNotification(ai: AiClient, userInput: string): Promise<Notification> {
  const content = await ai.complete([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ])

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new ExtractionError('not JSON')
  }

  const result = notificationSchema.safeParse(parsed)
  if (!result.success) throw new ExtractionError('unexpected shape')
  return result.data
}

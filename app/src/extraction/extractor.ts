import type { Notification } from '../notifications/notification.js'
import type { AiClient } from '../provider/ai-client.js'
import { normalizeFields } from './fields.js'
import { findJsonCandidate } from './json-candidate.js'
import { parseLenientJson } from './json-repair.js'
import { channelOf, findRecipients, isMentionedIn } from './recipient.js'

const SYSTEM_PROMPT = `Extract the notification the user wants to send.
Respond only with a JSON object with these fields:
- "to": the email address or phone number of the recipient
- "message": the text to send
- "type": "email" or "sms"`

const RETRY_NOTE = `Your previous answer could not be used. Return only the JSON object, with no other text.`

export class ExtractionError extends Error {
  constructor(
    reason: string,
    readonly retryable = true,
  ) {
    super(`invalid AI response: ${reason}`)
    this.name = 'ExtractionError'
  }
}

export async function extractNotification(ai: AiClient, userInput: string): Promise<Notification> {
  try {
    return await extractOnce(ai, SYSTEM_PROMPT, userInput)
  } catch (err) {
    if (!(err instanceof ExtractionError) || !err.retryable) throw err
    console.warn(`Retrying extraction: ${err.message}`)
    return extractOnce(ai, `${SYSTEM_PROMPT}\n\n${RETRY_NOTE}`, userInput)
  }
}

// The correction goes in the system message: the user message is always the user's own text.
async function extractOnce(ai: AiClient, systemPrompt: string, userInput: string): Promise<Notification> {
  const content = await ai.complete([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ])
  return toNotification(content, userInput)
}

function toNotification(content: string, userInput: string): Notification {
  const candidate = findJsonCandidate(content)
  if (candidate === undefined) throw new ExtractionError('no JSON found')

  const fields = normalizeFields(parseObject(candidate))

  const to = fields.to ?? recipientFromUserInput(userInput)
  const channel = channelOf(to)
  if (!channel) throw new ExtractionError('recipient is not an email or phone number')
  if (!isMentionedIn(to, userInput)) throw new ExtractionError('recipient not in user input')

  const type = fields.type ?? channel
  if (type !== channel) throw new ExtractionError('type does not match recipient')

  if (!fields.message) throw new ExtractionError('missing message')

  return { to, message: fields.message, type: channel }
}

function parseObject(candidate: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = parseLenientJson(candidate)
  } catch {
    throw new ExtractionError('malformed JSON')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ExtractionError('JSON is not an object')
  }
  return parsed as Record<string, unknown>
}

// The AI response is not trusted to invent a recipient: a missing one is only taken from the user's own words.
function recipientFromUserInput(userInput: string): string {
  const recipients = findRecipients(userInput)
  if (recipients.length === 0) throw new ExtractionError('missing recipient', false)
  if (recipients.length > 1) throw new ExtractionError('ambiguous recipient', false)
  return recipients[0]
}

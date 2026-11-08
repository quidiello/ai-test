import type { Notification } from '../notifications/notification.js'
import type { AiClient } from '../provider/ai-client.js'
import { normalizeFields } from './fields.js'
import { findJsonCandidate } from './json-candidate.js'
import { parseLenientJson } from './json-repair.js'
import { RETRY_HINTS, SYSTEM_PROMPT } from './prompt.js'
import { channelOf, isMentionedIn } from './recipient.js'

export class ExtractionError extends Error {
  // The hint tells the AI what to fix on the retry; without one, the error is not retried.
  constructor(
    reason: string,
    readonly retryHint?: string,
  ) {
    super(`invalid AI response: ${reason}`)
    this.name = 'ExtractionError'
  }
}

export async function extractNotification(ai: AiClient, userInput: string): Promise<Notification> {
  try {
    return await extractOnce(ai, SYSTEM_PROMPT, userInput)
  } catch (err) {
    if (!(err instanceof ExtractionError) || !err.retryHint) throw err
    console.warn(`Retrying extraction: ${err.message}`)
    return extractOnce(ai, `${SYSTEM_PROMPT}\n\n${err.retryHint}`, userInput)
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
  if (candidate === undefined) throw new ExtractionError('no JSON found', RETRY_HINTS.invalidJson)

  const parsed = parseObject(candidate)
  if (typeof parsed.error === 'string') throw new ExtractionError(`AI reported ${parsed.error}`)

  const fields = normalizeFields(parsed)

  if (!fields.to) throw new ExtractionError('missing recipient', RETRY_HINTS.missingRecipient)
  const channel = channelOf(fields.to)
  if (!channel) throw new ExtractionError('recipient is not an email or phone number', RETRY_HINTS.invalidRecipient)
  if (!isMentionedIn(fields.to, userInput)) {
    throw new ExtractionError('recipient not in user input', RETRY_HINTS.recipientNotInMessage)
  }

  const type = fields.type ?? channel
  if (type !== channel) throw new ExtractionError('type does not match recipient', RETRY_HINTS.typeMismatch)

  if (!fields.message) throw new ExtractionError('missing message', RETRY_HINTS.missingMessage)

  return { to: fields.to, message: fields.message, type: channel }
}

function parseObject(candidate: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = parseLenientJson(candidate)
  } catch {
    throw new ExtractionError('malformed JSON', RETRY_HINTS.invalidJson)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ExtractionError('JSON is not an object', RETRY_HINTS.invalidJson)
  }
  return parsed as Record<string, unknown>
}

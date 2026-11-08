import { vi } from 'vitest'
import type { Notification } from '../src/notifications/notification.js'
import type { AiClient, ChatMessage } from '../src/provider/ai-client.js'
import type { NotifyClient } from '../src/provider/notify-client.js'

// Answers with each response in turn and keeps repeating the last one.
export function fakeAi(...responses: string[]) {
  const complete = vi.fn<(messages: ChatMessage[]) => Promise<string>>()
  for (const response of responses) complete.mockResolvedValueOnce(response)
  if (responses.length > 0) complete.mockResolvedValue(responses[responses.length - 1])
  return { complete } satisfies AiClient
}

export function pendingAi() {
  return { complete: vi.fn(() => new Promise<string>(() => {})) } satisfies AiClient
}

export function failingAi(error: Error) {
  return { complete: vi.fn().mockRejectedValue(error) } satisfies AiClient
}

export function fakeNotifier() {
  return { send: vi.fn<(notification: Notification) => Promise<void>>().mockResolvedValue(undefined) } satisfies NotifyClient
}

export function failingNotifier(error: Error) {
  return { send: vi.fn().mockRejectedValue(error) } satisfies NotifyClient
}

export const VALID_EXTRACTION = '{"to": "feda@test.com", "message": "hola", "type": "email"}'

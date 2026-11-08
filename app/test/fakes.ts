import { vi } from 'vitest'
import type { Notification } from '../src/notifications/notification.js'
import type { AiClient, ChatMessage } from '../src/provider/ai-client.js'
import type { NotifyClient } from '../src/provider/notify-client.js'

export function fakeAi(...responses: string[]) {
  const complete = vi.fn<(messages: ChatMessage[]) => Promise<string>>()
  for (const response of responses) complete.mockResolvedValueOnce(response)
  return { complete } satisfies AiClient
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

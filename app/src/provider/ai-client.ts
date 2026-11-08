import type { ProviderConfig } from '../config.js'
import { ProviderError } from './provider-error.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiClient {
  complete(messages: ChatMessage[]): Promise<string>
}

interface ChatCompletion {
  choices: { message: { content: string } }[]
}

export function createAiClient({ baseUrl, apiKey }: ProviderConfig): AiClient {
  return {
    async complete(messages) {
      const res = await fetch(`${baseUrl}/v1/ai/extract`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
      if (!res.ok) throw new ProviderError('ai/extract', res.status)

      const completion = (await res.json()) as ChatCompletion
      return completion.choices[0].message.content
    },
  }
}

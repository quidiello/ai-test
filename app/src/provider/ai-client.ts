import type { ClientConfig } from '../config.js'
import { providerPost } from './provider-post.js'

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

export function createAiClient(config: ClientConfig): AiClient {
  return {
    async complete(messages) {
      const res = await providerPost(config, 'ai/extract', { messages })
      const completion = (await res.json()) as ChatCompletion
      return completion.choices[0].message.content
    },
  }
}

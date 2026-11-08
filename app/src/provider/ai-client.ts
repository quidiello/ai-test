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
      const body = await providerPost(config, 'ai/extract', { messages })
      const completion = JSON.parse(body) as ChatCompletion
      return completion.choices[0].message.content
    },
  }
}

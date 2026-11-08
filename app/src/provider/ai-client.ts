import { z } from 'zod'
import type { ClientConfig } from '../config.js'
import { ProviderResponseError } from './provider-error.js'
import { providerPost } from './provider-post.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiClient {
  complete(messages: ChatMessage[]): Promise<string>
}

const chatCompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
})

export function createAiClient(config: ClientConfig): AiClient {
  return {
    async complete(messages) {
      const body = await providerPost(config, 'ai/extract', { messages })
      return firstAnswer(body)
    },
  }
}

function firstAnswer(body: string): string {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    throw new ProviderResponseError('ai/extract')
  }

  const completion = chatCompletionSchema.safeParse(json)
  if (!completion.success) throw new ProviderResponseError('ai/extract')
  return completion.data.choices[0].message.content
}

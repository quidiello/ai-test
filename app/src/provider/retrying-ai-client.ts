import { errorMessage } from '../error-message.js'
import type { AiClient, ChatMessage } from './ai-client.js'
import { isTransientError, retryDelay } from './provider-error.js'

export interface AiRetryOptions {
  maxAttempts: number
  retryBaseDelayMs: number
}

export class RetryingAiClient implements AiClient {
  constructor(
    private readonly ai: AiClient,
    private readonly options: AiRetryOptions,
  ) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.ai.complete(messages)
      } catch (err) {
        if (!isTransientError(err) || attempt >= this.options.maxAttempts) throw err
        console.warn(`Retrying AI call: ${errorMessage(err)}`)
        await sleep(retryDelay(this.options.retryBaseDelayMs, attempt))
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

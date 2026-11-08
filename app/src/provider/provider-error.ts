import { errorMessage } from '../error-message.js'

export class ProviderError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`${endpoint} responded ${status}`)
    this.name = 'ProviderError'
  }
}

// Errors worth retrying: rate limits, provider failures, timeouts and network errors. Anything else fails at once.
export function isTransientError(err: unknown): boolean {
  if (err instanceof ProviderError) return err.status === 429 || err.status >= 500
  return err instanceof ProviderTimeoutError || err instanceof ProviderNetworkError
}

// Doubles on each attempt; the random factor keeps retries from hitting the provider all at once.
export function retryDelay(baseDelayMs: number, attempt: number): number {
  return baseDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random())
}

export class ProviderTimeoutError extends Error {
  constructor(
    readonly endpoint: string,
    readonly timeoutMs: number,
  ) {
    super(`${endpoint} timed out after ${timeoutMs} ms`)
    this.name = 'ProviderTimeoutError'
  }
}

export class ProviderResponseError extends Error {
  constructor(readonly endpoint: string) {
    super(`${endpoint} returned an unexpected response`)
    this.name = 'ProviderResponseError'
  }
}

export class ProviderNetworkError extends Error {
  constructor(
    readonly endpoint: string,
    cause: unknown,
  ) {
    super(`${endpoint} could not be reached: ${errorMessage(cause)}`, { cause })
    this.name = 'ProviderNetworkError'
  }
}

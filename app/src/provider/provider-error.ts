export class ProviderError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`${endpoint} responded ${status}`)
    this.name = 'ProviderError'
  }
}

// Errors worth retrying: rate limits, provider failures, timeouts and network errors.
export function isTransientError(err: unknown): boolean {
  if (err instanceof ProviderError) return err.status === 429 || err.status >= 500
  return true
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

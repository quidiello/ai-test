export class ProviderError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`${endpoint} responded ${status}`)
    this.name = 'ProviderError'
  }
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

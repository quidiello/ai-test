export class ProviderError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`${endpoint} responded ${status}`)
    this.name = 'ProviderError'
  }
}

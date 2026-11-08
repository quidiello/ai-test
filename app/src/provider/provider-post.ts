import type { ClientConfig } from '../config.js'
import { ProviderError, ProviderTimeoutError } from './provider-error.js'

export async function providerPost(
  { baseUrl, apiKey, timeoutMs }: ClientConfig,
  endpoint: string,
  body: unknown,
): Promise<Response> {
  try {
    const res = await fetch(`${baseUrl}/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new ProviderError(endpoint, res.status)
    return res
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') throw new ProviderTimeoutError(endpoint, timeoutMs)
    throw err
  }
}

import type { ClientConfig } from '../config.js'
import { ProviderError, ProviderNetworkError, ProviderTimeoutError } from './provider-error.js'

// Returns the response body as text. The timeout covers reading the body too.
export async function providerPost(
  { baseUrl, apiKey, timeoutMs }: ClientConfig,
  endpoint: string,
  body: unknown,
): Promise<string> {
  let res: Response
  let text: string
  try {
    res = await fetch(`${baseUrl}/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    text = await res.text()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') throw new ProviderTimeoutError(endpoint, timeoutMs)
    throw new ProviderNetworkError(endpoint, err)
  }

  if (!res.ok) throw new ProviderError(endpoint, res.status)
  return text
}

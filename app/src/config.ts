import type { DispatcherOptions } from './notifications/dispatcher.js'
import type { AiRetryOptions } from './provider/retrying-ai-client.js'

export interface ProviderConfig {
  baseUrl: string
  apiKey: string
}

export interface ClientConfig extends ProviderConfig {
  timeoutMs: number
}

export interface Config {
  provider: ProviderConfig
  ai: AiRetryOptions & { timeoutMs: number }
  notify: DispatcherOptions & { timeoutMs: number }
}

export function loadConfig(): Config {
  return {
    provider: {
      baseUrl: requiredEnv('PROVIDER_URL'),
      apiKey: requiredEnv('PROVIDER_API_KEY'),
    },
    ai: {
      timeoutMs: positiveNumberEnv('AI_TIMEOUT_MS'),
      maxAttempts: 3,
      retryBaseDelayMs: 500,
    },
    notify: {
      timeoutMs: positiveNumberEnv('NOTIFY_TIMEOUT_MS'),
      ratePerSecond: positiveNumberEnv('NOTIFY_RATE_PER_SECOND'),
      maxAttempts: 5,
      retryBaseDelayMs: 1000,
    },
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

function positiveNumberEnv(name: string): number {
  const value = Number(requiredEnv(name))
  if (!(value > 0)) throw new Error(`Environment variable ${name} must be a positive number`)
  return value
}

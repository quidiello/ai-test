export interface ProviderConfig {
  baseUrl: string
  apiKey: string
}

export interface Config {
  provider: ProviderConfig
}

export function loadConfig(): Config {
  return {
    provider: {
      baseUrl: requiredEnv('PROVIDER_URL'),
      apiKey: requiredEnv('PROVIDER_API_KEY'),
    },
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

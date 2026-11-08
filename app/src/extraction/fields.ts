export interface ExtractedFields {
  to?: string
  message?: string
  type?: string
}

const ALIASES: Record<keyof ExtractedFields, string[]> = {
  to: ['to', 'recipient', 'destination'],
  message: ['message', 'body', 'text'],
  type: ['type', 'channel', 'method'],
}

export function normalizeFields(raw: Record<string, unknown>): ExtractedFields {
  const byLowerKey = new Map(Object.entries(raw).map(([key, value]) => [key.toLowerCase(), value]))
  const fields: ExtractedFields = {}

  for (const [field, aliases] of Object.entries(ALIASES) as [keyof ExtractedFields, string[]][]) {
    const value = aliases.map((alias) => byLowerKey.get(alias)).find((v) => typeof v === 'string' && v.trim() !== '')
    if (typeof value === 'string') fields[field] = value.trim()
  }

  if (fields.type) fields.type = fields.type.toLowerCase()
  return fields
}

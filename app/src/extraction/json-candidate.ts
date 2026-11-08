const CODE_BLOCK = /```(?:json)?\s*([\s\S]*?)```/i

export function findJsonCandidate(text: string): string | undefined {
  const source = CODE_BLOCK.exec(text)?.[1] ?? text

  const start = source.indexOf('{')
  if (start === -1) return undefined

  const end = source.lastIndexOf('}')
  return (end > start ? source.slice(start, end + 1) : source.slice(start)).trim()
}

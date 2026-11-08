const CODE_BLOCK = /```(?:json)?\s*([\s\S]*?)```/i

export function findJsonCandidate(text: string): string | undefined {
  const source = CODE_BLOCK.exec(text)?.[1] ?? text

  const start = source.indexOf('{')
  if (start === -1) return undefined

  const end = closingBraceOf(source, start)
  return (end === -1 ? source.slice(start) : source.slice(start, end + 1)).trim()
}

// Index of the brace that closes the one at `start`, ignoring braces inside strings; -1 if it is never closed.
function closingBraceOf(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (char === '\\') i++
      else if (char === '"') inString = false
    } else if (char === '"') {
      inString = true
    } else if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

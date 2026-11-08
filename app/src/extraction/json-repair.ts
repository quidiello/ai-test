const DOUBLE_QUOTED_STRING = /"(?:[^"\\]|\\.)*"/g

export function parseLenientJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return JSON.parse(repair(text))
  }
}

function repair(text: string): string {
  let json = text.trim().replace(/\s*(?:\.\.\.|…)$/, '')

  json = outsideStrings(json, (part) => part.replace(/'([^']*)'/g, '"$1"'))
  json = outsideStrings(json, (part) =>
    part.replace(/([{,]\s*)([A-Za-z_][\w-]*)\s*:/g, '$1"$2":').replace(/,\s*(?=[}\]])/g, ''),
  )

  if (countOf(json, '"') % 2 === 1) json += '"'
  json += '}'.repeat(Math.max(0, countOf(json, '{') - countOf(json, '}')))
  return json
}

// Applies the fix only to the parts outside double-quoted strings, so values are never altered.
function outsideStrings(json: string, fix: (part: string) => string): string {
  let result = ''
  let last = 0
  for (const match of json.matchAll(DOUBLE_QUOTED_STRING)) {
    result += fix(json.slice(last, match.index)) + match[0]
    last = match.index + match[0].length
  }
  return result + fix(json.slice(last))
}

function countOf(text: string, char: string): number {
  return text.split(char).length - 1
}

export function extractAssignedJson(source, variableName) {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const marker = new RegExp(`(?:window\\.)?${escapedName}\\s*=`).exec(source)
  if (!marker) return undefined
  const start = source.indexOf('{', marker.index + marker[0].length)
  if (start < 0) return undefined
  let depth = 0
  let quoted = false
  let escaped = false
  for (let i = start; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') quoted = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) return source.slice(start, i + 1)
  }
  return undefined
}

export const edgeId = (e) => `${e.source}→${e.target}::${e.label}`

export function shortGroup(name = '') {
  const m = name.match(/^(F\d|\d\d)\b/)
  if (m) return m[1]
  if (/spine/i.test(name)) return 'SPINE'
  if (/client experience/i.test(name)) return 'EXPERIENCE'
  if (/client/i.test(name)) return 'CLIENT'
  if (/telemetry/i.test(name)) return 'DATA'
  return name.slice(0, 12).toUpperCase()
}

export function timeAgo(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'string' && !ts.endsWith('Z') ? ts.replace(' ', 'T') + 'Z' : ts)
  const s = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return d.toLocaleDateString()
}

export const bytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`)

export const ROLE_LABEL = { core: 'Core entity', shared: 'Shared spine', neighbour: 'Cross-domain neighbour', flow: 'Flow context', client: 'Client-defined' }

export function cleanMojibake(text) {
  if (!text || typeof text !== 'string') return text || ''
  return text
    .replace(/â€“|â€”|â€"|â€\x9d|â€\x9c/g, '—')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/Ã—/g, '×')
    .replace(/â†’/g, '→')
    .replace(/âˆ’/g, '-')
    .replace(/Ã·/g, '/')
    .replace(/Â§|§/g, '')
    .replace(/Â/g, '')
    .trim()
}


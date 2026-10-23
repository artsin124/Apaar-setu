// Indian digit grouping: 1842310 -> 18,42,310
export function inr(n) {
  return Number(n).toLocaleString('en-IN')
}

// 739428105621 -> "7394 2810 5621"
export function apaar(id = '') {
  const d = String(id).replace(/\D/g, '')
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

// Show only the last 4 digits
export function maskApaar(id = '') {
  const d = String(id).replace(/\D/g, '')
  if (d.length < 4) return 'XXXX XXXX XXXX'
  return `XXXX XXXX ${d.slice(-4)}`
}

export function pct(a, b) {
  if (!b) return 0
  return Math.round((a / b) * 1000) / 10
}

export function dateTime(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dateOnly(d) {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

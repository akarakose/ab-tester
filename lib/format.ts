export function fmtPct(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

export function fmtNum(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(decimals)
}

// Format a stored metric value using the format string detected at upload time.
// format shapes: 'decimal' | 'integer' | 'percentage' | 'currency:<sym>' | 'currency_int:<sym>'
export function fmtValue(value: number, format?: string | null): string {
  if (!Number.isFinite(value)) return '—'
  if (!format || format === 'decimal') return value.toFixed(2)
  if (format === 'integer') return Math.round(value).toLocaleString()
  if (format === 'percentage') return `${value.toFixed(2)}%`
  if (format.startsWith('currency_int:')) {
    const sym = format.slice(13)
    return `${sym}${Math.round(value).toLocaleString()}`
  }
  if (format.startsWith('currency:')) {
    const sym = format.slice(9)
    return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return value.toFixed(2)
}
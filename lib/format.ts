export function fmtPct(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

export function fmtNum(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(decimals)
}
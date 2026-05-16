import { detectMetricType } from '@/lib/logic/metricDetection'
import type { MetricKind } from '@/types/experiment'

export type ParsedRow = {
  metric: string
  values: number[]
  type: MetricKind
  autoDetected: boolean       // true when set by autodetection (not range-forced and not user override)
  forcedContinuous: boolean   // true when range outside [0,100] forces continuous
  format: string              // display format detected from raw CSV values
  skipTest: boolean           // user opt-out of significance testing for this row (binomial/continuous only)
}

export type ParsedCsv = {
  variantNames: string[]
  rows: ParsedRow[]
}

export function isEligibleVisitorSource(values: number[]): boolean {
  return values.length > 0 && values.every(v => Number.isFinite(v) && v > 0 && Number.isInteger(v))
}

export function splitCsvRow(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current.trim())
  return cols
}

export type DecimalFormat = 'us' | 'eu'

// Decide whether the CSV uses '.' (US) or ',' (EU) as the decimal separator.
// Looks for tokens like "1.50" (us) vs "1,50" (eu) and ignores 3-digit groupings,
// which can be either decimals (1.500) or thousands separators (1,000).
export function detectDecimalFormat(rawValues: string[]): DecimalFormat {
  let euVotes = 0
  let usVotes = 0
  for (const raw of rawValues) {
    if (/,\d{1,2}\b/.test(raw) && !/,\d{3}\b/.test(raw)) euVotes++
    if (/\.\d{1,2}\b/.test(raw) && !/\.\d{3}\b/.test(raw)) usVotes++
  }
  return euVotes > usVotes ? 'eu' : 'us'
}

export function toNumber(raw: string, format: DecimalFormat): number {
  // Strip currency symbols, percent signs, whitespace — keep digits, separators, minus.
  const stripped = raw.replace(/[^\d.,\-]/g, '')
  if (stripped === '') return NaN
  const normalized = format === 'eu'
    ? stripped.replace(/\./g, '').replace(',', '.')
    : stripped.replace(/,/g, '')
  return parseFloat(normalized)
}

const CURRENCY_SYM_RE = /[$€£¥₩₺₴₦₨₱฿₫]/

// Returns a format string for fmtValue based on what the user actually typed.
export function detectRowFormat(rawValues: string[], parsedValues: number[]): string {
  if (rawValues.some(v => v.trim().endsWith('%'))) return 'percentage'
  const symMatch = rawValues.map(v => v.match(CURRENCY_SYM_RE)).find(m => m !== null)
  if (symMatch) {
    const sym = symMatch[0]
    const isInt = parsedValues.every(v => Number.isFinite(v) && v === Math.floor(v))
    return isInt ? `currency_int:${sym}` : `currency:${sym}`
  }
  const isInt = parsedValues.every(v => Number.isFinite(v) && v === Math.floor(v))
  return isInt ? 'integer' : 'decimal'
}

export function parseCsv(text: string): ParsedCsv | string {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return 'CSV must have a header row and at least one data row.'

  const header = splitCsvRow(lines[0]).map(h => h.trim())
  const variantNames = header.slice(1).filter(Boolean)
  if (variantNames.length < 2) return 'CSV must have at least two variant columns.'

  if (variantNames.some(n => /<[^>]*>/.test(n)))
    return 'Column headers must be plain text with no HTML tags.'

  type DataRow = { lineIndex: number; metric: string; rawValues: string[] }
  const dataRows: DataRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i])
    const metric = cols[0]
    if (!metric) continue
    if (/<[^>]*>/.test(metric))
      return `Row ${i + 1}: metric names must be plain text with no HTML tags.`
    dataRows.push({ lineIndex: i, metric, rawValues: cols.slice(1, variantNames.length + 1) })
  }

  const rows: ParsedRow[] = []
  for (const { lineIndex: i, metric, rawValues } of dataRows) {
    // Per-row format detection — a CSV exported from Excel can mix US-decimal numeric
    // cells with EU-decimal string cells the user typed by hand. Voting per row catches
    // the EU row even when most of the sheet is US.
    const format = detectDecimalFormat(rawValues)
    const values = rawValues.map(v => toNumber(v, format))
    if (values.some(v => isNaN(v))) return `Row ${i + 1} ("${metric}") contains non-numeric values.`

    const detection = detectMetricType(metric, values)
    if (detection.type === 'no_test') {
      // No-test detected from header keywords — values can be anything.
    } else if (detection.type === 'continuous' && detection.reason !== 'range') {
      // Continuous from header hint — values can be anything, no range validation
    } else if (detection.type === 'binomial' && values.some(v => v < 0 || v > 100)) {
      // Conflict: detected binomial but values exceed 0–100. Override to continuous.
      detection.type = 'continuous'
      detection.reason = 'range'
    } else if (detection.type === 'continuous' && values.some(v => v <= 0)) {
      return `Row ${i + 1} ("${metric}") has non-positive values — continuous metrics must be positive.`
    }

    rows.push({
      metric,
      values,
      type: detection.type,
      autoDetected: detection.confident,
      forcedContinuous: detection.reason === 'range',
      format: detectRowFormat(rawValues, values),
      skipTest: false,
    })
  }

  if (rows.length === 0) return 'No valid data rows found.'
  return { variantNames, rows }
}
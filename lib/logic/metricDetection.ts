import type { MetricKind } from '@/types/experiment'

export type DetectionReason = 'range' | 'soft_range' | 'header' | 'default'
export type DetectionResult = {
  type: MetricKind
  reason: DetectionReason
  confident: boolean
}

const NO_TEST_KEYWORDS = [
  'total', 'sum', 'aggregate', 'overall', 'gross', 'nominal',
]

const CONTINUOUS_KEYWORDS = [
  'revenue', 'mean', 'avg', 'average', 'value', 'count',
  'duration', 'score', 'amount', 'time', 'aov', 'arpu', 'spend',
]

const BINOMIAL_KEYWORDS = [
  'rate', '%', 'ctr', 'conversion', 'click', 'signup',
  'retention', 'churn', 'opt-in', 'opt in', 'open rate',
]

function noTestHint(name: string): boolean {
  const lower = name.toLowerCase()
  return NO_TEST_KEYWORDS.some(k => lower.includes(k))
}

function headerHints(name: string): 'binomial' | 'continuous' | null {
  const lower = name.toLowerCase()
  if (CONTINUOUS_KEYWORDS.some(k => lower.includes(k))) return 'continuous'
  if (BINOMIAL_KEYWORDS.some(k => lower.includes(k))) return 'binomial'
  return null
}

export function detectMetricType(name: string, values: number[]): DetectionResult {
  if (noTestHint(name)) {
    return { type: 'no_test', reason: 'header', confident: true }
  }

  const outOfRange = values.some(v => v > 100 || v < 0)
  if (outOfRange) {
    return { type: 'continuous', reason: 'range', confident: true }
  }

  const hint = headerHints(name)
  if (hint) {
    return { type: hint, reason: 'header', confident: true }
  }

  // Smart default: a metric with no rate-keyword whose values exceed 1 is most
  // likely a per-user count or mean (continuous), not a fraction. Skip when any
  // value is non-positive — continuous metrics must be > 0.
  if (values.every(v => v > 0) && values.some(v => v > 1)) {
    return { type: 'continuous', reason: 'soft_range', confident: true }
  }

  return { type: 'binomial', reason: 'default', confident: false }
}
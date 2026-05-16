import { describe, expect, it } from 'vitest'
import {
  buildContinuousSample,
  calculateContinuousResults,
  cohensDLabel,
  welchTest,
} from '@/lib/logic/welch'
import type { Properties } from '@/types/experiment'

const sample = (name: string, mean: number, std: number, n: number) =>
  buildContinuousSample(name, mean, std, n)

describe('cohensDLabel', () => {
  it('returns the right label for each band', () => {
    expect(cohensDLabel(0.1)).toBeNull()
    expect(cohensDLabel(0.2)).toBe('small')
    expect(cohensDLabel(0.4999)).toBe('small')
    expect(cohensDLabel(0.5)).toBe('medium')
    expect(cohensDLabel(0.7999)).toBe('medium')
    expect(cohensDLabel(0.8)).toBe('large')
    expect(cohensDLabel(5)).toBe('large')
  })

  it('uses absolute value (negative effects are still labelled)', () => {
    expect(cohensDLabel(-0.8)).toBe('large')
    expect(cohensDLabel(-0.3)).toBe('small')
  })
})

describe('buildContinuousSample', () => {
  it('preserves provided std dev and marks as not estimated', () => {
    const s = sample('A', 5, 2, 100)
    expect(s.mean).toBe(5)
    expect(s.std_dev).toBe(2)
    expect(s.sample_size).toBe(100)
    expect(s.std_dev_estimated).toBe(false)
  })

  it('estimates std dev as sqrt(mean) when null (Poisson) and flags estimation', () => {
    const s = buildContinuousSample('A', 9, null, 50)
    expect(s.std_dev).toBeCloseTo(3, 10)
    expect(s.std_dev_estimated).toBe(true)
  })

  it('clamps negative mean to 0 before sqrt for the Poisson estimate', () => {
    const s = buildContinuousSample('A', -1, null, 10)
    expect(s.std_dev).toBe(0)
    expect(s.std_dev_estimated).toBe(true)
  })
})

describe('welchTest', () => {
  it('identical means → p ≈ 1, not significant', () => {
    const r = welchTest(sample('A', 10, 2, 100), sample('B', 10, 2, 100), 0.05)
    expect(r.p_value).toBeCloseTo(1, 4)
    expect(r.is_significant).toBe(false)
    expect(r.uplift).toBeCloseTo(0, 6)
    expect(r.cohens_d).toBeCloseTo(0, 6)
  })

  it('clearly different means with large n → p ≈ 0, significant, positive uplift', () => {
    const r = welchTest(sample('A', 10, 2, 1000), sample('B', 11, 2, 1000), 0.05)
    expect(r.p_value).toBeLessThan(1e-10)
    expect(r.is_significant).toBe(true)
    expect(r.uplift).toBeCloseTo(10, 4)
    expect(r.cohens_d).toBeCloseTo(0.5, 2)
    expect(r.ci_lo).toBeLessThan(r.ci_hi)
  })

  it('challenger worse than control → negative uplift and negative-ish CI', () => {
    const r = welchTest(sample('A', 10, 2, 1000), sample('B', 9, 2, 1000), 0.05)
    expect(r.uplift).toBeCloseTo(-10, 4)
    expect(r.is_significant).toBe(true)
    expect(r.ci_hi).toBeLessThan(0)
  })

  it('control mean of 0: uplift returned as 0 (not NaN/Infinity)', () => {
    const r = welchTest(sample('A', 0, 1, 100), sample('B', 1, 1, 100), 0.05)
    expect(r.uplift).toBe(0)
    expect(Number.isFinite(r.p_value)).toBe(true)
  })

  it('zero-variance samples: t-stat = 0, no NaN values', () => {
    // se = 0 → division guarded to t = 0 → p = 1.
    const r = welchTest(sample('A', 5, 0, 100), sample('B', 5, 0, 100), 0.05)
    expect(Number.isFinite(r.p_value)).toBe(true)
    expect(r.cohens_d).toBe(0)
    expect(r.is_significant).toBe(false)
  })

  it('respects the alpha threshold for significance', () => {
    // Pick numbers where p sits between 0.01 and 0.05.
    const r05 = welchTest(sample('A', 10, 3, 200), sample('B', 10.6, 3, 200), 0.05)
    const r01 = welchTest(sample('A', 10, 3, 200), sample('B', 10.6, 3, 200), 0.01)
    expect(r05.p_value).toBeCloseTo(r01.p_value, 6)  // same data, same p
    expect(r05.is_significant).toBe(true)
    expect(r01.is_significant).toBe(false)
  })

  it('confidence interval contains the observed mean difference', () => {
    const r = welchTest(sample('A', 10, 2, 500), sample('B', 12, 2.5, 500), 0.05)
    const diff = 12 - 10
    expect(r.ci_lo).toBeLessThan(diff)
    expect(r.ci_hi).toBeGreaterThan(diff)
  })

  it('reports std_dev_estimated flag from the challenger sample', () => {
    const control = sample('A', 5, 2, 100)
    const challengerEstimated = buildContinuousSample('B', 6, null, 100)
    const r = welchTest(control, challengerEstimated, 0.05)
    expect(r.std_dev_estimated).toBe(true)
  })
})

// Helper to build a continuous_single Properties — mirrors what the action layer stores.
function continuousProps(rows: { name: string; mean: number; std: number | null; n: number }[]): Properties {
  const anyStdProvided = rows.some(r => r.std !== null)
  return {
    experiment_type: 'continuous_single',
    variant_names: rows.map(r => r.name),
    metric_names: ['Revenue'],
    metric_types: ['continuous'],
    metric_values: rows.map(r => [r.mean]),
    N: rows.map(r => [r.n]),
    std_dev: anyStdProvided ? rows.map(r => [r.std]) : null,
    visitor_group_labels: [''],
  }
}

describe('calculateContinuousResults', () => {
  it('produces control snapshot + per-challenger results', () => {
    const r = calculateContinuousResults(
      continuousProps([
        { name: 'A', mean: 10, std: 2, n: 1000 },
        { name: 'B', mean: 10.5, std: 2, n: 1000 },
      ]),
      0.95,
    )
    expect(r.control.name).toBe('A')
    expect(r.control.mean).toBe(10)
    expect(r.challengers).toHaveLength(1)
    expect(r.challengers[0].mean).toBe(10.5)
  })

  it('applies Bonferroni: more challengers → tighter alpha → harder to reach significance', () => {
    // Same effect, but with several challengers, alpha shrinks.
    const one = calculateContinuousResults(
      continuousProps([
        { name: 'A', mean: 10, std: 3, n: 200 },
        { name: 'B', mean: 10.7, std: 3, n: 200 },
      ]),
      0.95,
    )
    const many = calculateContinuousResults(
      continuousProps([
        { name: 'A', mean: 10, std: 3, n: 200 },
        { name: 'B', mean: 10.7, std: 3, n: 200 },
        { name: 'C', mean: 10.7, std: 3, n: 200 },
        { name: 'D', mean: 10.7, std: 3, n: 200 },
        { name: 'E', mean: 10.7, std: 3, n: 200 },
        { name: 'F', mean: 10.7, std: 3, n: 200 },
      ]),
      0.95,
    )
    // Same per-challenger p-value, stricter threshold once challenger count grows.
    expect(many.challengers[0].p_value).toBeCloseTo(one.challengers[0].p_value, 6)
    expect(one.challengers[0].is_significant).toBe(true)
    expect(many.challengers[0].is_significant).toBe(false)
  })

  it('uses Poisson estimate when std_dev is null in properties', () => {
    const r = calculateContinuousResults(
      continuousProps([
        { name: 'A', mean: 4, std: null, n: 200 },
        { name: 'B', mean: 4.5, std: null, n: 200 },
      ]),
      0.95,
    )
    expect(r.control.std_dev_estimated).toBe(true)
    expect(r.challengers[0].std_dev_estimated).toBe(true)
  })
})
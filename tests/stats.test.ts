import { describe, expect, it } from 'vitest'
import { calculateResults, calculateMultipleMeasuresResults } from '@/lib/stats'
import type {
  BinomialMetricResult,
  ContinuousMetricResult,
  NoTestMetricResult,
  Properties,
} from '@/types/experiment'

// Helper: build a binomial_single Properties with rates expressed as fractions (0..1).
function binomialSingleProps(rows: { name: string; visitors: number; rate: number }[]): Properties {
  return {
    experiment_type: 'binomial_single',
    variant_names: rows.map(r => r.name),
    metric_names: ['Conversion'],
    metric_types: ['binomial'],
    metric_values: rows.map(r => [r.rate]),
    N: rows.map(r => [r.visitors]),
    std_dev: null,
    visitor_group_labels: [''],
  }
}

describe('calculateResults — binomial_single', () => {
  it('control + 1 challenger with identical rates → not significant', () => {
    const props = binomialSingleProps([
      { name: 'A', visitors: 10_000, rate: 0.10 },
      { name: 'B', visitors: 10_000, rate: 0.10 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.control.name).toBe('A')
    expect(r.control.conversion_rate).toBeCloseTo(0.10, 4)
    expect(r.challengers).toHaveLength(1)
    expect(r.challengers[0].is_significant).toBe(false)
    expect(r.challengers[0].p_value).toBeGreaterThan(0.9)
    expect(r.challengers[0].uplift).toBeCloseTo(0, 4)
  })

  it('large clearly different rates → significant', () => {
    const props = binomialSingleProps([
      { name: 'A', visitors: 10_000, rate: 0.05 },
      { name: 'B', visitors: 10_000, rate: 0.07 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.challengers[0].is_significant).toBe(true)
    expect(r.challengers[0].p_value).toBeLessThan(0.01)
    expect(r.challengers[0].uplift).toBeCloseTo(40, 1)
    expect(r.challengers[0].z_score).toBeGreaterThan(0)
  })

  it('challenger worse than control → negative uplift, still significant when far enough', () => {
    const props = binomialSingleProps([
      { name: 'A', visitors: 10_000, rate: 0.10 },
      { name: 'B', visitors: 10_000, rate: 0.07 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.challengers[0].uplift).toBeLessThan(0)
    expect(r.challengers[0].is_significant).toBe(true)
    expect(r.challengers[0].z_score).toBeLessThan(0)
  })

  it('5 challengers: Bonferroni alpha is divided so a borderline result is no longer significant', () => {
    // Pick numbers where p ≈ 0.016 — clears alpha=0.05 but not alpha=0.05/5=0.01.
    const onePropOne = binomialSingleProps([
      { name: 'A', visitors: 5_000, rate: 0.04 },
      { name: 'B', visitors: 5_000, rate: 0.05 },
    ])
    const one = calculateResults(onePropOne, 0.95)
    expect(one.challengers[0].is_significant).toBe(true)
    expect(one.challengers[0].p_value).toBeGreaterThan(0.01)
    expect(one.challengers[0].p_value).toBeLessThan(0.05)

    const propsMany = binomialSingleProps([
      { name: 'A', visitors: 5_000, rate: 0.04 },
      { name: 'B', visitors: 5_000, rate: 0.05 },
      { name: 'C', visitors: 5_000, rate: 0.05 },
      { name: 'D', visitors: 5_000, rate: 0.05 },
      { name: 'E', visitors: 5_000, rate: 0.05 },
      { name: 'F', visitors: 5_000, rate: 0.05 },
    ])
    const many = calculateResults(propsMany, 0.95)
    expect(many.challengers).toHaveLength(5)
    // p-values are identical to the 1-challenger case but the bar is tighter.
    for (const c of many.challengers) {
      expect(c.p_value).toBeCloseTo(one.challengers[0].p_value, 6)
      expect(c.is_significant).toBe(false)  // same p, stricter alpha
    }
  })

  it('100% conversion in challenger vs lower control: significant, positive uplift', () => {
    const props = binomialSingleProps([
      { name: 'A', visitors: 100, rate: 0.50 },
      { name: 'B', visitors: 100, rate: 1.00 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.challengers[0].conversion_rate).toBe(1)
    expect(r.challengers[0].uplift).toBeCloseTo(100, 4)
    expect(r.challengers[0].is_significant).toBe(true)
  })

  it('0% conversion in challenger vs higher control: significant, -100% uplift', () => {
    const props = binomialSingleProps([
      { name: 'A', visitors: 100, rate: 0.50 },
      { name: 'B', visitors: 100, rate: 0.00 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.challengers[0].conversion_rate).toBe(0)
    expect(r.challengers[0].uplift).toBeCloseTo(-100, 4)
    expect(r.challengers[0].is_significant).toBe(true)
  })

  it('zero visitors: no crash, is_significant=false, control rate=0', () => {
    // Zero visitors is an invalid input that server-side validation already rejects;
    // here we only assert the maths layer doesn't crash and never falsely claims significance.
    const props = binomialSingleProps([
      { name: 'A', visitors: 0, rate: 0 },
      { name: 'B', visitors: 0, rate: 0 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.control.conversion_rate).toBe(0)
    expect(r.challengers[0].is_significant).toBe(false)
    // Display layer (fmtNum / fmtPct) renders NaN as "—", so a NaN p_value here is acceptable.
  })

  it('both variants at identical 100% conversion: z = 0, p = 1', () => {
    const props = binomialSingleProps([
      { name: 'A', visitors: 100, rate: 1 },
      { name: 'B', visitors: 100, rate: 1 },
    ])
    const r = calculateResults(props, 0.95)
    expect(r.challengers[0].p_value).toBeCloseTo(1, 4)
    expect(r.challengers[0].z_score).toBe(0)
    expect(r.challengers[0].is_significant).toBe(false)
  })

  it('confidence level changes significance threshold', () => {
    // Effect right around p≈0.04: significant at 95% but not at 99%.
    const props = binomialSingleProps([
      { name: 'A', visitors: 2000, rate: 0.10 },
      { name: 'B', visitors: 2000, rate: 0.125 },
    ])
    const at95 = calculateResults(props, 0.95).challengers[0]
    const at99 = calculateResults(props, 0.99).challengers[0]
    expect(at95.p_value).toBeCloseTo(at99.p_value, 6)
    expect(at95.is_significant).toBe(true)
    expect(at99.is_significant).toBe(false)
  })
})

// --- multi-measures ---

// Builder that mirrors what buildMultipleMeasuresProperties produces.
type Spec = {
  variants: string[]
  metrics: {
    name: string
    type: 'binomial' | 'continuous' | 'no_test'
    values: number[]   // per variant; binomial values are stored as 0..1 fractions here
    N?: number[]       // per variant; defaults to 0 for no_test / untested
    label?: string
    tested?: boolean   // defaults to true (false for no_test)
  }[]
}

function multiProps(spec: Spec): Properties {
  const numV = spec.variants.length
  const numM = spec.metrics.length
  const metric_values: number[][] = Array.from({ length: numV }, () => Array(numM).fill(0))
  const N: number[][] = Array.from({ length: numV }, () => Array(numM).fill(0))
  for (let m = 0; m < numM; m++) {
    const met = spec.metrics[m]
    for (let v = 0; v < numV; v++) {
      metric_values[v][m] = met.values[v]
      N[v][m] = met.N?.[v] ?? 0
    }
  }
  return {
    experiment_type: 'multiple_measures',
    variant_names: spec.variants,
    metric_names: spec.metrics.map(m => m.name),
    metric_types: spec.metrics.map(m => m.type),
    metric_values,
    N,
    std_dev: null,
    visitor_group_labels: spec.metrics.map(m => m.label ?? ''),
    metric_tested: spec.metrics.map(m => (m.type === 'no_test' ? false : (m.tested ?? true))),
  }
}

describe('calculateMultipleMeasuresResults', () => {
  it('dispatches each metric type to the correct result shape', () => {
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        { name: 'CTR', type: 'binomial', values: [0.10, 0.12], N: [10_000, 10_000] },
        { name: 'Revenue', type: 'continuous', values: [1.20, 1.30], N: [1000, 1000] },
        { name: 'Total users', type: 'no_test', values: [1000, 1050] },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)
    expect(r).toHaveLength(3)
    expect(r[0].type).toBe('binomial')
    expect(r[1].type).toBe('continuous')
    expect(r[2].type).toBe('no_test')
  })

  it('no_test metric: uplift computed against control, no p-value', () => {
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        { name: 'Total users', type: 'no_test', values: [1000, 1200] },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as NoTestMetricResult
    expect(r.type).toBe('no_test')
    expect(r.control.value).toBe(1000)
    expect(r.challengers[0].uplift).toBeCloseTo(20, 4)
    // Discriminated union — no p-value field on NoTestMetricResult, which is the contract.
    expect('p_value' in r.challengers[0]).toBe(false)
  })

  it('no_test uplift handles control == 0 without NaN', () => {
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        { name: 'Sales', type: 'no_test', values: [0, 100] },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as NoTestMetricResult
    expect(r.challengers[0].uplift).toBe(0)  // we treat control=0 as 0 uplift (safe display)
  })

  it('untested binomial: p_value NaN, is_significant false, uplift still computed', () => {
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        // Skipped — we still want to *see* rate + uplift in the results table.
        { name: 'CTR', type: 'binomial', values: [0.10, 0.15], N: [0, 0], tested: false },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as BinomialMetricResult
    expect(r.tested).toBe(false)
    expect(r.control.rate).toBeCloseTo(0.10, 6)
    expect(Number.isNaN(r.challengers[0].p_value)).toBe(true)
    expect(Number.isNaN(r.challengers[0].z_score)).toBe(true)
    expect(r.challengers[0].is_significant).toBe(false)
    expect(r.challengers[0].uplift).toBeCloseTo(50, 4)
  })

  it('untested continuous: p_value NaN, ci NaN, uplift still computed', () => {
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        { name: 'Revenue', type: 'continuous', values: [1.0, 1.5], N: [0, 0], tested: false },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as ContinuousMetricResult
    expect(r.tested).toBe(false)
    expect(r.control.mean).toBe(1.0)
    expect(Number.isNaN(r.challengers[0].p_value)).toBe(true)
    expect(Number.isNaN(r.challengers[0].ci_lo)).toBe(true)
    expect(Number.isNaN(r.challengers[0].ci_hi)).toBe(true)
    expect(r.challengers[0].uplift).toBeCloseTo(50, 4)
    expect(r.challengers[0].is_significant).toBe(false)
  })

  it('tested binomial inside multi-measures behaves like single binomial', () => {
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        { name: 'CTR', type: 'binomial', values: [0.05, 0.07], N: [10_000, 10_000] },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as BinomialMetricResult
    expect(r.tested).toBe(true)
    expect(r.challengers[0].is_significant).toBe(true)
    expect(r.challengers[0].p_value).toBeLessThan(0.01)
  })

  it('legacy properties without metric_tested still default to tested=true', () => {
    // Simulate an old experiment that predates the metric_tested field.
    const props = multiProps({
      variants: ['A', 'B'],
      metrics: [
        { name: 'CTR', type: 'binomial', values: [0.10, 0.12], N: [10_000, 10_000] },
      ],
    })
    delete (props as Properties).metric_tested
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as BinomialMetricResult
    expect(r.tested).toBe(true)
  })

  it('5 variants (4 challengers): alpha divided across challengers', () => {
    const props = multiProps({
      variants: ['A', 'B', 'C', 'D', 'E'],
      metrics: [
        // All challengers identical to A → none should be significant regardless of alpha.
        { name: 'CTR', type: 'binomial', values: [0.10, 0.10, 0.10, 0.10, 0.10], N: [1000, 1000, 1000, 1000, 1000] },
      ],
    })
    const r = calculateMultipleMeasuresResults(props, 0.95)[0] as BinomialMetricResult
    expect(r.challengers).toHaveLength(4)
    for (const c of r.challengers) {
      expect(c.is_significant).toBe(false)
    }
  })
})
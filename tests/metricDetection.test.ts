import { describe, expect, it } from 'vitest'
import { detectMetricType } from '@/lib/logic/metricDetection'

describe('detectMetricType', () => {
  describe('no_test header keywords', () => {
    it('matches "total ..."', () => {
      const r = detectMetricType('Total revenue', [1000, 1200])
      expect(r.type).toBe('no_test')
      expect(r.reason).toBe('header')
      expect(r.confident).toBe(true)
    })

    it('matches "sum ..."', () => {
      expect(detectMetricType('Sum of clicks', [50, 80]).type).toBe('no_test')
    })

    it('matches "overall ..."', () => {
      expect(detectMetricType('Overall users', [1000, 1100]).type).toBe('no_test')
    })

    it('is case-insensitive', () => {
      expect(detectMetricType('TOTAL REVENUE', [10, 20]).type).toBe('no_test')
    })
  })

  describe('range rule (forces continuous)', () => {
    it('values above 100 → continuous, locked (reason=range)', () => {
      const r = detectMetricType('Revenue per user', [120, 130])
      expect(r.type).toBe('continuous')
      expect(r.reason).toBe('range')
    })

    it('negative values → continuous, locked', () => {
      const r = detectMetricType('Net change', [-5, 3])
      expect(r.type).toBe('continuous')
      expect(r.reason).toBe('range')
    })

    it('range rule wins over header keywords (except no_test which checks first)', () => {
      // "rate" suggests binomial, but value 150 is out of [0,100] → forced continuous.
      const r = detectMetricType('Conversion rate', [150, 200])
      expect(r.type).toBe('continuous')
      expect(r.reason).toBe('range')
    })
  })

  describe('continuous header keywords', () => {
    it('"revenue" → continuous via header', () => {
      const r = detectMetricType('Revenue per user', [1.5, 2.0])
      expect(r.type).toBe('continuous')
      expect(r.reason).toBe('header')
    })

    it('"duration" → continuous via header', () => {
      expect(detectMetricType('Session duration', [12.4, 13.1]).type).toBe('continuous')
    })

    it('"aov" → continuous via header', () => {
      expect(detectMetricType('AOV', [42.5, 45.2]).type).toBe('continuous')
    })
  })

  describe('binomial header keywords', () => {
    it('"rate" → binomial when values are in [0,100]', () => {
      const r = detectMetricType('Conversion rate', [4.5, 5.2])
      expect(r.type).toBe('binomial')
      expect(r.reason).toBe('header')
    })

    it('"%" in header → binomial', () => {
      expect(detectMetricType('CTR %', [2.1, 2.4]).type).toBe('binomial')
    })

    it('"signup" → binomial', () => {
      expect(detectMetricType('Signup conversion', [10, 12]).type).toBe('binomial')
    })

    it('"churn" → binomial', () => {
      expect(detectMetricType('Churn', [5, 4]).type).toBe('binomial')
    })
  })

  describe('soft-range default (>1, no rate keyword)', () => {
    it('values >1 with no rate hint → continuous, soft (toggleable)', () => {
      const r = detectMetricType('Items per user', [3.5, 4.2])
      expect(r.type).toBe('continuous')
      expect(r.reason).toBe('soft_range')
      expect(r.confident).toBe(true)
    })

    it('soft range needs every value positive — falls through to default otherwise', () => {
      // One value is 0 → soft_range guard `every(v => v > 0)` fails → default branch.
      const r = detectMetricType('Items per user', [0, 3.5])
      expect(r.reason).toBe('default')
    })
  })

  describe('default fallback', () => {
    it('all values ≤ 1 with no hints → binomial, not confident', () => {
      const r = detectMetricType('Metric X', [0.4, 0.5])
      expect(r.type).toBe('binomial')
      expect(r.reason).toBe('default')
      expect(r.confident).toBe(false)
    })
  })

  describe('priority order', () => {
    it('no_test header beats range check', () => {
      // "Total" matches no_test FIRST; values out of [0,100] don't matter.
      const r = detectMetricType('Total widgets', [5000, 6000])
      expect(r.type).toBe('no_test')
    })

    it('range check beats header hint for binomial', () => {
      // Same as the case above with "Conversion rate" + values=150 — pinned here.
      const r = detectMetricType('Click rate', [120, 130])
      expect(r.type).toBe('continuous')
      expect(r.reason).toBe('range')
    })
  })
})
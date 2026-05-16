import { describe, expect, it } from 'vitest'
import {
  detectDecimalFormat,
  detectRowFormat,
  isEligibleVisitorSource,
  parseCsv,
  splitCsvRow,
  toNumber,
} from '@/lib/logic/csvParse'

describe('splitCsvRow', () => {
  it('splits a simple unquoted row', () => {
    expect(splitCsvRow('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('treats commas inside double quotes as part of the field (EU decimal in CSV)', () => {
    expect(splitCsvRow('Revenue,"1,11","2,22"')).toEqual(['Revenue', '1,11', '2,22'])
  })

  it('strips surrounding whitespace per field', () => {
    expect(splitCsvRow(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles empty trailing field', () => {
    expect(splitCsvRow('a,b,')).toEqual(['a', 'b', ''])
  })
})

describe('detectDecimalFormat', () => {
  it('returns "us" when nothing is decisive (no mixed signals)', () => {
    expect(detectDecimalFormat(['100', '200', '300'])).toBe('us')
  })

  it('flags EU when comma+1-2 trailing digits dominate', () => {
    expect(detectDecimalFormat(['1,11', '2,22', '3,33'])).toBe('eu')
  })

  it('flags US when period+1-2 trailing digits dominate', () => {
    expect(detectDecimalFormat(['1.11', '2.22', '3.33'])).toBe('us')
  })

  it('three-digit groupings are NOT counted as decimal evidence', () => {
    // "1,000" is ambiguous — could be EU 1.000 OR US thousands. By default we treat as US thousands.
    expect(detectDecimalFormat(['1,000', '2,000'])).toBe('us')
    expect(detectDecimalFormat(['1.000', '2.000'])).toBe('us')
  })

  it('mixed signals: majority wins', () => {
    expect(detectDecimalFormat(['1,50', '2,75', '3.5'])).toBe('eu')
  })
})

describe('toNumber', () => {
  it('parses a plain US-format decimal', () => {
    expect(toNumber('1.23', 'us')).toBeCloseTo(1.23)
  })

  it('parses an EU-format decimal', () => {
    expect(toNumber('1,23', 'eu')).toBeCloseTo(1.23)
  })

  it('strips currency symbols before parsing', () => {
    expect(toNumber('$1,234.56', 'us')).toBeCloseTo(1234.56)
    expect(toNumber('€1.234,56', 'eu')).toBeCloseTo(1234.56)
  })

  it('strips percentage signs', () => {
    expect(toNumber('45.20%', 'us')).toBeCloseTo(45.20)
  })

  it('preserves the negative sign', () => {
    expect(toNumber('-12.5', 'us')).toBeCloseTo(-12.5)
  })

  it('returns NaN for non-numeric strings', () => {
    expect(toNumber('abc', 'us')).toBeNaN()
    expect(toNumber('', 'us')).toBeNaN()
  })

  it('integer 1000.0 stays as 1000', () => {
    expect(toNumber('1000.0', 'us')).toBe(1000)
  })
})

describe('detectRowFormat', () => {
  it('returns "percentage" when any raw value ends in %', () => {
    expect(detectRowFormat(['45.2%', '52.1%'], [45.2, 52.1])).toBe('percentage')
  })

  it('returns "currency:$" with the detected symbol when decimal', () => {
    expect(detectRowFormat(['$1.23', '$1.45'], [1.23, 1.45])).toBe('currency:$')
  })

  it('returns "currency_int:$" when all parsed values are integers', () => {
    expect(detectRowFormat(['$1234', '$5678'], [1234, 5678])).toBe('currency_int:$')
  })

  it('returns "integer" when no symbols and all integer values', () => {
    expect(detectRowFormat(['100', '200'], [100, 200])).toBe('integer')
  })

  it('returns "decimal" when no symbols and at least one fractional value', () => {
    expect(detectRowFormat(['1.5', '2.0'], [1.5, 2.0])).toBe('decimal')
  })

  it('different currency symbols are preserved verbatim', () => {
    expect(detectRowFormat(['€10', '€20'], [10, 20])).toBe('currency_int:€')
    expect(detectRowFormat(['£1.50', '£2.00'], [1.5, 2.0])).toBe('currency:£')
  })
})

describe('isEligibleVisitorSource', () => {
  it('accepts arrays of positive integers (including 1000.0)', () => {
    expect(isEligibleVisitorSource([1000, 2000])).toBe(true)
    expect(isEligibleVisitorSource([1000.0, 1100.0])).toBe(true)
  })

  it('rejects when any value is fractional', () => {
    expect(isEligibleVisitorSource([100, 100.5])).toBe(false)
  })

  it('rejects when any value is zero or negative', () => {
    expect(isEligibleVisitorSource([0, 100])).toBe(false)
    expect(isEligibleVisitorSource([100, -1])).toBe(false)
  })

  it('rejects empty arrays', () => {
    expect(isEligibleVisitorSource([])).toBe(false)
  })
})

describe('parseCsv — happy path', () => {
  it('parses a minimal valid CSV', () => {
    const csv = 'metric,A,B\nConversion Rate,5.2,6.1'
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.variantNames).toEqual(['A', 'B'])
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].metric).toBe('Conversion Rate')
    expect(r.rows[0].values).toEqual([5.2, 6.1])
    expect(r.rows[0].type).toBe('binomial')
  })

  it('detects no_test, continuous, and binomial across rows in one pass', () => {
    const csv = [
      'metric,A,B',
      'Total revenue,1000,1200',     // no_test (keyword)
      'Revenue per user,1.32,1.97',  // continuous (keyword)
      'Conversion rate,5.2,6.1',     // binomial (keyword)
    ].join('\n')
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows.map(row => row.type)).toEqual(['no_test', 'continuous', 'binomial'])
  })

  it('quoted EU-decimal fields stay one cell after splitting', () => {
    const csv = 'metric,A,B\nRevenue per user,"1,11","1,97"'
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows[0].values).toEqual([1.11, 1.97])
  })

  it('detects EU vs US decimal format per-CSV and parses consistently', () => {
    const csv = [
      'metric,A,B',
      'Revenue,"1,11","1,22"',
      'AOV,"2,33","2,44"',
    ].join('\n')
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows[0].values).toEqual([1.11, 1.22])
    expect(r.rows[1].values).toEqual([2.33, 2.44])
  })

  it('detects decimal format per row when a sheet mixes EU and US rows', () => {
    // Real-world case: an Excel export where most rows are US numbers but one row
    // was typed by hand as EU strings ($1,11). Global voting picks US (the majority),
    // and the EU row's "1,11" gets stripped to 111 → wrongly forced continuous.
    // Per-row detection rescues that row.
    const csv = [
      'metric,default,price_12,price_15',
      'total users,"3,000","3,050","3,100"',
      'total revenue," $1,000.00 "," $1,100.00 "," $1,200.00 "',
      'revenue per user," $1,11 "," $1,15 "," $1,19 "',
      'message sent per user,0.74,1.01,1.21',
    ].join('\n')
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows[0].values).toEqual([3000, 3050, 3100])             // integers, US
    expect(r.rows[1].values).toEqual([1000, 1100, 1200])             // US decimal w/ thousands
    expect(r.rows[2].values[0]).toBeCloseTo(1.11, 4)                 // EU decimal — the bug
    expect(r.rows[2].values[1]).toBeCloseTo(1.15, 4)
    expect(r.rows[2].values[2]).toBeCloseTo(1.19, 4)
    expect(r.rows[2].forcedContinuous).toBe(false)                   // values fit [0,100] now
    expect(r.rows[3].values).toEqual([0.74, 1.01, 1.21])             // US decimals
  })

  it('preserves percentage format per row', () => {
    const csv = 'metric,A,B\nCTR,5.20%,6.10%'
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows[0].format).toBe('percentage')
    expect(r.rows[0].values).toEqual([5.2, 6.1])
  })

  it('preserves currency format with the right symbol and integer vs decimal', () => {
    const csv = [
      'metric,A,B',
      'AOV,$12.50,$14.25',
      'Sales,$100,$120',
    ].join('\n')
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows[0].format).toBe('currency:$')
    expect(r.rows[1].format).toBe('currency_int:$')
  })

  it('every row has skipTest=false by default (set by the user later in the UI)', () => {
    const r = parseCsv('metric,A,B\nCTR,5.2,6.1')
    if (typeof r === 'string') throw new Error('unexpected error')
    expect(r.rows[0].skipTest).toBe(false)
  })
})

describe('parseCsv — error cases', () => {
  it('rejects single-line CSV (no data)', () => {
    expect(parseCsv('metric,A,B')).toMatch(/at least one data row/)
  })

  it('rejects when fewer than 2 variants', () => {
    expect(parseCsv('metric,A\nCTR,5')).toMatch(/at least two variant columns/)
  })

  it('rejects HTML in variant headers', () => {
    expect(parseCsv('metric,A,<b>B</b>\nCTR,5,6')).toMatch(/Column headers must be plain text/)
  })

  it('rejects HTML in metric name', () => {
    expect(parseCsv('metric,A,B\n<b>CTR</b>,5,6')).toMatch(/metric names must be plain text/)
  })

  it('rejects non-numeric data cells', () => {
    expect(parseCsv('metric,A,B\nCTR,abc,6')).toMatch(/non-numeric values/)
  })

  it('rejects continuous metric with non-positive values when forced by range', () => {
    // A negative value forces range→continuous, then the non-positive guard rejects.
    // For *header-detected* continuous (e.g. "Revenue"), zeros/negatives are intentionally
    // allowed at parse time and deferred to server-side validation.
    expect(parseCsv('metric,A,B\nFoo,-1,1.5')).toMatch(/non-positive values/)
  })

  it('overrides binomial → continuous when values exceed [0,100]', () => {
    // "Conversion rate" + values >100 should resolve as continuous with reason=range
    const csv = 'metric,A,B\nConversion rate,150,200'
    const r = parseCsv(csv)
    if (typeof r === 'string') throw new Error(`unexpected error: ${r}`)
    expect(r.rows[0].type).toBe('continuous')
    expect(r.rows[0].forcedContinuous).toBe(true)
  })
})
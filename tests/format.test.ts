import { describe, expect, it } from 'vitest'
import { fmtNum, fmtPct, fmtValue } from '@/lib/format'

describe('fmtPct', () => {
  it('multiplies by 100 and appends %', () => {
    expect(fmtPct(0.05)).toBe('5.00%')
    expect(fmtPct(0.4521)).toBe('45.21%')
  })

  it('honours the decimals argument', () => {
    expect(fmtPct(0.5, 0)).toBe('50%')
    expect(fmtPct(0.5, 4)).toBe('50.0000%')
  })

  it('returns em dash for non-finite inputs', () => {
    expect(fmtPct(NaN)).toBe('—')
    expect(fmtPct(Infinity)).toBe('—')
    expect(fmtPct(-Infinity)).toBe('—')
  })
})

describe('fmtNum', () => {
  it('rounds to the requested decimals', () => {
    expect(fmtNum(1.23456, 2)).toBe('1.23')
    expect(fmtNum(1.23456, 4)).toBe('1.2346')
  })

  it('defaults to 3 decimals', () => {
    expect(fmtNum(1)).toBe('1.000')
  })

  it('returns em dash for non-finite inputs', () => {
    expect(fmtNum(NaN)).toBe('—')
    expect(fmtNum(Infinity)).toBe('—')
  })
})

describe('fmtValue', () => {
  it('defaults to 2-decimal display when no format is given', () => {
    expect(fmtValue(1.234)).toBe('1.23')
    expect(fmtValue(1.234, null)).toBe('1.23')
  })

  it('format=decimal → 2 decimals', () => {
    expect(fmtValue(1.5, 'decimal')).toBe('1.50')
  })

  it('format=integer → rounded with locale separators', () => {
    expect(fmtValue(1234, 'integer')).toBe('1,234')
    expect(fmtValue(1234.6, 'integer')).toBe('1,235')
  })

  it('format=percentage → trailing %', () => {
    expect(fmtValue(45.2, 'percentage')).toBe('45.20%')
  })

  it('format=currency:<sym> → symbol + locale-formatted decimal', () => {
    expect(fmtValue(1234.5, 'currency:$')).toBe('$1,234.50')
    expect(fmtValue(1234.5, 'currency:€')).toBe('€1,234.50')
  })

  it('format=currency_int:<sym> → symbol + rounded integer', () => {
    expect(fmtValue(1234, 'currency_int:$')).toBe('$1,234')
    expect(fmtValue(1234.4, 'currency_int:£')).toBe('£1,234')
  })

  it('falls back to 2 decimals for unknown format strings', () => {
    expect(fmtValue(1.5, 'unknown-format')).toBe('1.50')
  })

  it('returns em dash for NaN / Infinity regardless of format', () => {
    expect(fmtValue(NaN, 'percentage')).toBe('—')
    expect(fmtValue(Infinity, 'currency:$')).toBe('—')
    expect(fmtValue(-Infinity, 'integer')).toBe('—')
  })
})
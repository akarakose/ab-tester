'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { createExperimentsFromCsv } from '@/lib/actions/experiments'
import type { CsvMetricInput } from '@/lib/actions/experiments.types'
import SubmitButton from '@/components/ui/SubmitButton'
import { detectMetricType } from '@/lib/logic/metricDetection'
import { fmtValue } from '@/lib/format'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

type MetricKind = 'binomial' | 'continuous' | 'no_test'

type ParsedRow = {
  metric: string
  values: number[]
  type: MetricKind
  autoDetected: boolean       // true when set by autodetection (not range-forced and not user override)
  forcedContinuous: boolean   // true when range outside [0,100] forces continuous
  format: string              // display format detected from raw CSV values
}

type ParsedCsv = {
  variantNames: string[]
  rows: ParsedRow[]
}

type VisitorGroup = { visitors: number[]; metricIndices: number[]; label: string }

function splitCsvRow(line: string): string[] {
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

type DecimalFormat = 'us' | 'eu'

// Decide whether the CSV uses '.' (US) or ',' (EU) as the decimal separator.
// Looks for tokens like "1.50" (us) vs "1,50" (eu) and ignores 3-digit groupings,
// which can be either decimals (1.500) or thousands separators (1,000).
function detectDecimalFormat(rawValues: string[]): DecimalFormat {
  let euVotes = 0
  let usVotes = 0
  for (const raw of rawValues) {
    if (/,\d{1,2}\b/.test(raw) && !/,\d{3}\b/.test(raw)) euVotes++
    if (/\.\d{1,2}\b/.test(raw) && !/\.\d{3}\b/.test(raw)) usVotes++
  }
  return euVotes > usVotes ? 'eu' : 'us'
}

function toNumber(raw: string, format: DecimalFormat): number {
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
function detectRowFormat(rawValues: string[], parsedValues: number[]): string {
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

function parseCsv(text: string): ParsedCsv | string {
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

  const format = detectDecimalFormat(dataRows.flatMap(r => r.rawValues))

  const rows: ParsedRow[] = []
  for (const { lineIndex: i, metric, rawValues } of dataRows) {
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
    })
  }

  if (rows.length === 0) return 'No valid data rows found.'
  return { variantNames, rows }
}

export default function NewExperimentCsvPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; confidence_level?: string; visitors?: string; metrics?: string }>({})

  const [groups, setGroups] = useState<VisitorGroup[]>([])
  // Per-metric std_dev grid: stdDevs[metricIdx][variantIdx] — null = Poisson
  const [stdDevs, setStdDevs] = useState<(string)[][]>([])
  // Per-metric expansion of std_dev row
  const [showStdDev, setShowStdDev] = useState<boolean[]>([])
  const [isPending, startTransition] = useTransition()

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseCsv(text)
      if (typeof result === 'string') {
        setParseError(result)
        setParsed(null)
        setGroups([])
        setStdDevs([])
        setShowStdDev([])
      } else {
        setParsed(result)
        setGroups([{
          visitors: result.variantNames.map(() => 0),
          metricIndices: result.rows.map((_, i) => i).filter(i => result.rows[i].type !== 'no_test'),
          label: '',
        }])
        setStdDevs(result.rows.map(() => result.variantNames.map(() => '')))
        setShowStdDev(result.rows.map(() => false))
        setParseError(null)
        setSubmitError(null)
      }
    }
    reader.readAsText(file)
  }

  const setMetricType = (mi: number, type: MetricKind) => {
    if (!parsed) return
    const row = parsed.rows[mi]
    if (row.forcedContinuous && type === 'binomial') return  // can't downgrade if values are out of [0,100]
    const wasNoTest = row.type === 'no_test'
    const isNoTest = type === 'no_test'
    setParsed({
      ...parsed,
      rows: parsed.rows.map((r, idx) => idx === mi ? { ...r, type, autoDetected: false } : r),
    })
    if (wasNoTest !== isNoTest) {
      setGroups(prev => prev.map((g, gi) => {
        if (isNoTest) {
          return { ...g, metricIndices: g.metricIndices.filter(m => m !== mi) }
        }
        if (gi === 0) {
          return { ...g, metricIndices: Array.from(new Set([...g.metricIndices, mi])).sort((a, b) => a - b) }
        }
        return g
      }))
    }
  }

  const toggleStdDev = (mi: number) =>
    setShowStdDev(prev => prev.map((v, idx) => idx === mi ? !v : v))

  const updateStdDev = (mi: number, vi: number, value: string) =>
    setStdDevs(prev => prev.map((row, idx) =>
      idx === mi ? row.map((v, j) => j === vi ? value : v) : row
    ))

  const updateGroupVisitor = (gi: number, vi: number, value: number) =>
    setGroups(prev => prev.map((g, idx) => idx === gi
      ? { ...g, visitors: g.visitors.map((v, i) => i === vi ? value : v) }
      : g))

  const updateGroupLabel = (gi: number, value: string) =>
    setGroups(prev => prev.map((g, idx) => idx === gi ? { ...g, label: value } : g))

  const moveMetricToGroup = (metricIdx: number, targetGi: number) =>
    setGroups(prev => prev.map((g, gi) => ({
      ...g,
      metricIndices: gi === targetGi
        ? Array.from(new Set([...g.metricIndices, metricIdx])).sort((a, b) => a - b)
        : g.metricIndices.filter(m => m !== metricIdx),
    })))

  const addGroup = () => {
    if (!parsed) return
    setGroups(prev => [...prev, { visitors: parsed.variantNames.map(() => 0), metricIndices: [], label: '' }])
  }

  const removeGroup = (gi: number) =>
    setGroups(prev => {
      const removed = prev[gi]
      const next = prev.filter((_, idx) => idx !== gi)
      if (next.length === 0) return prev
      next[0] = {
        ...next[0],
        metricIndices: Array.from(new Set([...next[0].metricIndices, ...removed.metricIndices])).sort((a, b) => a - b),
      }
      return next
    })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleSubmit = (e: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
    e.preventDefault()
    if (!parsed) return

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const confidence = Number((form.elements.namedItem('confidence_level') as HTMLInputElement).value)

    const errors: { name?: string; confidence_level?: string; visitors?: string; metrics?: string } = {}
    if (!name) errors.name = 'Experiment name is required.'
    if (confidence < 50 || confidence >= 100) errors.confidence_level = 'Confidence level must be between 50 and 99.9.'

    const activeGroups = groups.filter(g => g.metricIndices.length > 0)
    if (activeGroups.some(g => g.visitors.some(v => !v || v <= 0))) errors.visitors = 'All visitor counts must be greater than 0.'

    // Per-metric validation
    for (let mi = 0; mi < parsed.rows.length; mi++) {
      const row = parsed.rows[mi]
      if (row.type === 'binomial' && row.values.some(v => v < 0 || v > 100)) {
        errors.metrics = `Metric "${row.metric}" rates must be between 0 and 100.`
        break
      }
      if (row.type === 'continuous' && row.values.some(v => v <= 0)) {
        errors.metrics = `Metric "${row.metric}" means must be positive.`
        break
      }
      if (row.type === 'continuous') {
        for (let vi = 0; vi < parsed.variantNames.length; vi++) {
          const raw = stdDevs[mi]?.[vi]?.trim() ?? ''
          if (raw !== '') {
            const sd = Number(raw)
            if (!Number.isFinite(sd) || sd <= 0) {
              errors.metrics = `Metric "${row.metric}" std dev must be greater than 0.`
              break
            }
          }
        }
        if (errors.metrics) break
      }
    }

    const metrics: (CsvMetricInput | null)[] = parsed.rows.map((row, mi) => {
      if (row.type === 'no_test') {
        return {
          name: row.metric,
          type: 'no_test',
          values: row.values,
          visitors: parsed.variantNames.map(() => 0),
          format: row.format,
        }
      }
      const group = activeGroups.find(g => g.metricIndices.includes(mi))
      if (!group) return null
      const base: CsvMetricInput = {
        name: row.metric,
        type: row.type,
        values: row.values,
        visitors: group.visitors,
        format: row.format,
        ...(group.label ? { visitorGroupLabel: group.label } : {}),
      }
      if (row.type === 'continuous') {
        base.std_devs = (stdDevs[mi] ?? []).map(s => {
          const t = s.trim()
          if (t === '') return null
          const n = Number(t)
          return Number.isFinite(n) && n > 0 ? n : null
        })
      }
      return base
    })
    if (metrics.some(m => m === null)) errors.visitors = 'Every testable metric must be assigned to a visitor group.'

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setSubmitError(null)
    startTransition(async () => {
      const result = await createExperimentsFromCsv({
        experimentName: name,
        variantNames: parsed.variantNames,
        metrics: metrics as CsvMetricInput[],
        confidenceLevel: confidence,
      })
      if (result?.error) setSubmitError(result.error)
      // On success the server action redirects to the new experiment's detail page.
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <Link href="/dashboard/experiments/new" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-bold mt-3">Upload CSV</h1>
        <p className="text-sm text-foreground/50 mt-1">Import experiment results from a spreadsheet.</p>
      </div>

      {!parsed ? (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-14 cursor-pointer transition-colors ${
              isDragging ? 'border-brand bg-brand/5' : 'border-foreground/20 hover:border-foreground/35 hover:bg-foreground/3'
            }`}
          >
            <svg className="w-8 h-8 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium">Drop your CSV here</p>
              <p className="text-xs text-foreground/45 mt-0.5">or click to browse</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div className="mt-4 rounded-lg border border-foreground/10 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 3%, var(--background))' }}>
            <p className="text-xs font-medium text-foreground/50 mb-2">Expected format</p>
            <pre className="text-xs text-foreground/60 font-mono leading-relaxed">{`measure_name,variant_a,variant_b\nConversion Rate,5.20,6.10\nRevenue per User,1.32,1.97`}</pre>
            <p className="text-xs text-foreground/40 mt-2">Each row will be auto-classified as a conversion rate (0–100%) or continuous metric. Visitor counts and std devs are entered after uploading.</p>
          </div>

          {parseError && <p className="mt-3 text-sm text-red-500">{parseError}</p>}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{parsed.rows.length} metric{parsed.rows.length !== 1 ? 's' : ''} detected</p>
              <button
                type="button"
                onClick={() => { setParsed(null); setParseError(null); setGroups([]); setStdDevs([]); setShowStdDev([]) }}
                className="text-xs text-foreground/40 hover:text-foreground transition-colors"
              >
                Upload different file
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, var(--background))' }}>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground/50">Metric</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-foreground/50">Type</th>
                    {parsed.variantNames.map(name => (
                      <th key={name} className="text-right px-4 py-2.5 text-xs font-medium text-foreground/50">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, i) => (
                    <>
                      <tr key={`m-${i}`} className="border-b border-foreground/8 last:border-0">
                        <td className="px-4 py-2.5 font-medium align-top">
                          {row.metric}
                          {row.autoDetected && (
                            <span className="ml-1.5 text-[10px] text-foreground/40 font-normal" title="Type auto-detected from header">auto</span>
                          )}
                          {row.forcedContinuous && (
                            <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-500 font-normal" title="Values out of 0–100 range — must be continuous">forced</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="inline-flex p-0.5 rounded-md border border-foreground/15 bg-foreground/[0.02]">
                            <button
                              type="button"
                              onClick={() => setMetricType(i, 'binomial')}
                              disabled={row.forcedContinuous}
                              className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                                row.type === 'binomial'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-foreground/45 hover:text-foreground/70'
                              } ${row.forcedContinuous ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title={row.forcedContinuous ? 'Values exceed 0–100 — must be continuous' : ''}
                            >
                              Binomial
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetricType(i, 'continuous')}
                              className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                                row.type === 'continuous'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-foreground/45 hover:text-foreground/70'
                              }`}
                            >
                              Continuous
                            </button>
                            <button
                              type="button"
                              onClick={() => setMetricType(i, 'no_test')}
                              className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                                row.type === 'no_test'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-foreground/45 hover:text-foreground/70'
                              }`}
                              title="No statistical test will be applied"
                            >
                              No test
                            </button>
                          </div>
                          {row.type === 'continuous' && (
                            <button
                              type="button"
                              onClick={() => toggleStdDev(i)}
                              className="block mt-1.5 text-[11px] text-brand hover:opacity-75 transition-opacity"
                            >
                              {showStdDev[i] ? 'Hide std devs' : '+ Add std devs (optional)'}
                            </button>
                          )}
                          {row.type === 'no_test' && (
                            <p className="mt-1.5 text-[11px] text-foreground/40">No significance test</p>
                          )}
                        </td>
                        {row.values.map((val, j) => (
                          <td key={j} className="px-4 py-2.5 text-right text-foreground/70 align-top">
                            {fmtValue(val, row.format)}
                          </td>
                        ))}
                      </tr>
                      {row.type === 'continuous' && showStdDev[i] && (
                        <tr key={`s-${i}`} className="border-b border-foreground/8 last:border-0 bg-foreground/[0.015]">
                          <td className="px-4 py-2 text-xs text-foreground/50 font-medium" colSpan={2}>
                            ↳ Std dev <span className="text-foreground/30 font-normal">(optional, Poisson if blank)</span>
                          </td>
                          {parsed.variantNames.map((_, vi) => (
                            <td key={vi} className="px-2 py-1.5">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={stdDevs[i]?.[vi] ?? ''}
                                onChange={e => updateStdDev(i, vi, e.target.value)}
                                placeholder="auto"
                                className="w-full text-right text-xs border border-foreground/15 rounded px-2 py-1 bg-background outline-none focus:border-foreground/35"
                              />
                            </td>
                          ))}
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            {fieldErrors.metrics && <p className="text-sm text-red-500 mt-2">{fieldErrors.metrics}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="name" className={labelClass}>Experiment name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Homepage redesign"
              className={inputClass}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-500 mt-0.5">{fieldErrors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label className={labelClass}>Visitors / sample size per variant</label>
              <p className="text-xs text-foreground/40">
                {groups.length === 1 ? 'Same for all metrics' : `${groups.length} groups`}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {groups.map((group, gi) => (
                <div key={gi} className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={group.label}
                      onChange={e => updateGroupLabel(gi, e.target.value)}
                      placeholder={groups.length === 1 ? 'Group name (optional)' : `Group ${gi + 1}`}
                      className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-foreground/20 transition-colors placeholder:font-normal placeholder:text-foreground/30"
                    />
                    {groups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGroup(gi)}
                        className="text-xs text-foreground/40 hover:text-red-500 transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {parsed.variantNames.map((vName, vi) => (
                      <div key={vi} className="flex items-center gap-3">
                        <span className="text-sm text-foreground/60 w-32 shrink-0 truncate">{vName}</span>
                        <input
                          type="number"
                          min="1"
                          required={group.metricIndices.length > 0}
                          placeholder="e.g. 10000"
                          value={group.visitors[vi] || ''}
                          onChange={e => updateGroupVisitor(gi, vi, Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                  {groups.length > 1 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <p className="text-xs text-foreground/50">
                        Applies to {group.metricIndices.length === 0 ? 'no metrics yet' : `${group.metricIndices.length} metric${group.metricIndices.length !== 1 ? 's' : ''}`}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {parsed.rows.map((row, mi) => {
                          if (row.type === 'no_test') return null
                          const isHere = group.metricIndices.includes(mi)
                          return (
                            <button
                              key={mi}
                              type="button"
                              onClick={() => moveMetricToGroup(mi, gi)}
                              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                                isHere
                                  ? 'border-brand bg-brand/10 text-foreground'
                                  : 'border-foreground/15 text-foreground/50 hover:border-foreground/35 hover:text-foreground/70'
                              }`}
                            >
                              {row.metric}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {groups.length < parsed.rows.filter(r => r.type !== 'no_test').length && (
                <button
                  type="button"
                  onClick={addGroup}
                  className="text-sm text-brand hover:opacity-75 transition-opacity text-left"
                >
                  + Add visitor group
                </button>
              )}
            </div>
          </div>

          {fieldErrors.visitors && (
            <p className="text-sm text-red-500">{fieldErrors.visitors}</p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="confidence_level" className={labelClass}>Confidence level (%)</label>
            <input
              id="confidence_level"
              name="confidence_level"
              type="number"
              min="50"
              max="99.9"
              step="0.1"
              defaultValue="95"
              required
              className={inputClass}
            />
            <p className="text-xs text-foreground/40 mt-0.5">
              How certain you want to be before calling a winner. 95 is the industry standard.
            </p>
            {fieldErrors.confidence_level && (
              <p className="text-xs text-red-500 mt-0.5">{fieldErrors.confidence_level}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <SubmitButton
            pending={isPending}
            label="Create experiment"
            pendingLabel="Creating..."
          />
        </form>
      )}
    </div>
  )
}
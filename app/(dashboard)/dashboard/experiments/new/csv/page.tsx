'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createExperimentsFromCsv } from '@/lib/actions/experiments'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

type ParsedCsv = {
  variantNames: string[]
  rows: { metric: string; values: number[] }[]
}

type VisitorGroup = { visitors: number[]; metricIndices: number[]; label: string }

function parseCsv(text: string): ParsedCsv | string {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return 'CSV must have a header row and at least one data row.'

  const header = lines[0].split(',').map(h => h.trim())
  const variantNames = header.slice(1).filter(Boolean)
  if (variantNames.length < 2) return 'CSV must have at least two variant columns.'

  if (variantNames.some(n => /<[^>]*>/.test(n)))
    return 'Column headers must be plain text with no HTML tags.'

  const rows: ParsedCsv['rows'] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim())
    const metric = cols[0]
    if (!metric) continue

    if (/<[^>]*>/.test(metric))
      return `Row ${i + 1}: metric names must be plain text with no HTML tags.`

    const values = cols.slice(1, variantNames.length + 1).map(v => parseFloat(v))
    if (values.some(v => isNaN(v))) return `Row ${i + 1} ("${metric}") contains non-numeric values.`
    if (values.some(v => v < 0 || v > 100)) return `Row ${i + 1} ("${metric}") has values outside the 0–100% range.`

    rows.push({ metric, values })
  }

  if (rows.length === 0) return 'No valid data rows found.'
  return { variantNames, rows }
}

export default function NewExperimentCsvPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [groups, setGroups] = useState<VisitorGroup[]>([])
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
      } else {
        setParsed(result)
        setGroups([{
          visitors: result.variantNames.map(() => 0),
          metricIndices: result.rows.map((_, i) => i),
          label: '',
        }])
        setParseError(null)
        setSubmitError(null)
      }
    }
    reader.readAsText(file)
  }

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

    if (!name) { setSubmitError('Experiment name is required.'); return }
    if (confidence < 50 || confidence >= 100) { setSubmitError('Confidence level must be between 50 and 99.9.'); return }

    const activeGroups = groups.filter(g => g.metricIndices.length > 0)
    if (activeGroups.some(g => g.visitors.some(v => !v || v <= 0))) {
      setSubmitError('All visitor counts must be greater than 0.'); return
    }

    const metricsWithVisitors = parsed.rows.map((row, mi) => {
      const group = activeGroups.find(g => g.metricIndices.includes(mi))
      return group ? { name: row.metric, rates: row.values, visitors: group.visitors, visitorGroupLabel: group.label || undefined } : null
    })
    if (metricsWithVisitors.some(m => m === null)) {
      setSubmitError('Every metric must be assigned to a visitor group.'); return
    }

    setSubmitError(null)
    startTransition(async () => {
      const result = await createExperimentsFromCsv({
        experimentName: name,
        variantNames: parsed.variantNames,
        metrics: metricsWithVisitors as { name: string; rates: number[]; visitors: number[]; visitorGroupLabel?: string }[],
        confidenceLevel: confidence,
      })
      if (result?.error) {
        setSubmitError(result.error)
      } else {
        router.push('/dashboard/experiments')
      }
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
            <pre className="text-xs text-foreground/60 font-mono leading-relaxed">{`measure_name,variant_a,variant_b\nConversion Rate,5.20,6.10\nClick Rate,12.30,14.50`}</pre>
            <p className="text-xs text-foreground/40 mt-2">Values are percentages (0–100). Visitor counts are entered after uploading.</p>
          </div>

          {parseError && <p className="mt-3 text-sm text-red-500">{parseError}</p>}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Preview table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{parsed.rows.length} metric{parsed.rows.length !== 1 ? 's' : ''} detected</p>
              <button
                type="button"
                onClick={() => { setParsed(null); setParseError(null); setGroups([]) }}
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
                    {parsed.variantNames.map(name => (
                      <th key={name} className="text-right px-4 py-2.5 text-xs font-medium text-foreground/50">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, i) => (
                    <tr key={i} className={i < parsed.rows.length - 1 ? 'border-b border-foreground/8' : ''}>
                      <td className="px-4 py-2.5 font-medium">{row.metric}</td>
                      {row.values.map((val, j) => (
                        <td key={j} className="px-4 py-2.5 text-right text-foreground/70">{val.toFixed(2)}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Experiment name */}
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
          </div>

          {/* Visitor groups */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label className={labelClass}>Visitors per variant</label>
              <p className="text-xs text-foreground/40">
                {groups.length === 1 ? 'Same visitors for all metrics' : `${groups.length} groups`}
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
                          required
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
              {groups.length < parsed.rows.length && (
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

          {/* Confidence level */}
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
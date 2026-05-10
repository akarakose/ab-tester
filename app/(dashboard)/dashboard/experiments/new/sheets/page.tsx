'use client'

import { Fragment, useState, useTransition } from 'react'
import Link from 'next/link'
import { createExperimentsFromCsv } from '@/lib/actions/experiments'
import { fetchGoogleSheet } from '@/lib/actions/sheets'
import type { CsvMetricInput } from '@/lib/actions/experiments.types'
import SubmitButton from '@/components/ui/SubmitButton'
import MetricMultiSelect from '@/components/ui/MetricMultiSelect'
import { fmtValue } from '@/lib/format'
import { parseCsv, isEligibleVisitorSource } from '@/lib/logic/csvParse'
import type { ParsedCsv } from '@/lib/logic/csvParse'
import type { MetricKind } from '@/types/experiment'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

type VisitorGroup = { visitors: number[]; metricIndices: number[]; label: string; sourceMetricIndex: number | null }

export default function NewExperimentSheetsPage() {
  const [url, setUrl] = useState('')
  const [gidOverride, setGidOverride] = useState<string>('')
  const [showGidEditor, setShowGidEditor] = useState(false)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; confidence_level?: string; visitors?: string; metrics?: string }>({})
  const [sheetSource, setSheetSource] = useState<{ url: string; gid: number } | null>(null)
  const [isFetching, startFetchTransition] = useTransition()
  const [isPending, startTransition] = useTransition()

  const [groups, setGroups] = useState<VisitorGroup[]>([])
  const [stdDevs, setStdDevs] = useState<(string)[][]>([])
  const [showStdDev, setShowStdDev] = useState<boolean[]>([])

  const handleConnect = () => {
    setParseError(null)
    const overrideGid = gidOverride.trim() === '' ? undefined : Number(gidOverride.trim())
    if (overrideGid !== undefined && (!Number.isInteger(overrideGid) || overrideGid < 0)) {
      setParseError('Tab id must be a non-negative integer.')
      return
    }
    startFetchTransition(async () => {
      const res = await fetchGoogleSheet({ url, gid: overrideGid })
      if (!res.ok) {
        setParseError(res.error)
        return
      }
      const result = parseCsv(res.csv)
      if (typeof result === 'string') {
        setParseError(result)
        return
      }
      setParsed(result)
      setSheetSource({ url, gid: res.gid })
      setGroups([{
        visitors: result.variantNames.map(() => 0),
        metricIndices: result.rows.map((_, i) => i).filter(i => result.rows[i].type !== 'no_test'),
        label: '',
        sourceMetricIndex: null,
      }])
      setStdDevs(result.rows.map(() => result.variantNames.map(() => '')))
      setShowStdDev(result.rows.map(() => false))
      setSubmitError(null)
    })
  }

  const setMetricType = (mi: number, type: MetricKind) => {
    if (!parsed) return
    const row = parsed.rows[mi]
    if (row.forcedContinuous && type === 'binomial') return
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
        const next = g.sourceMetricIndex === mi ? { ...g, sourceMetricIndex: null } : g
        if (gi === 0) {
          return { ...next, metricIndices: Array.from(new Set([...next.metricIndices, mi])).sort((a, b) => a - b) }
        }
        return next
      }))
    }
  }

  const setGroupSource = (gi: number, sourceIdx: number | null) => {
    if (!parsed) return
    setGroups(prev => prev.map((g, idx) => {
      if (idx !== gi) return g
      if (sourceIdx === null) return { ...g, sourceMetricIndex: null }
      const sourceRow = parsed.rows[sourceIdx]
      return { ...g, sourceMetricIndex: sourceIdx, visitors: [...sourceRow.values] }
    }))
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

  const setMetricCheckedForGroup = (metricIdx: number, targetGi: number, checked: boolean) => {
    if (!parsed) return
    setParsed({
      ...parsed,
      rows: parsed.rows.map((r, idx) => idx === metricIdx ? { ...r, skipTest: !checked } : r),
    })
    if (checked) {
      setGroups(prev => prev.map((g, gi) => ({
        ...g,
        metricIndices: gi === targetGi
          ? Array.from(new Set([...g.metricIndices, metricIdx])).sort((a, b) => a - b)
          : g.metricIndices.filter(m => m !== metricIdx),
      })))
    } else {
      setGroups(prev => prev.map((g, gi) => gi === targetGi
        ? { ...g, metricIndices: g.metricIndices.filter(m => m !== metricIdx) }
        : g))
    }
  }

  const selectAllForGroup = (targetGi: number, visibleIds: number[]) => {
    if (!parsed || visibleIds.length === 0) return
    setParsed({
      ...parsed,
      rows: parsed.rows.map((r, idx) => visibleIds.includes(idx) ? { ...r, skipTest: false } : r),
    })
    setGroups(prev => prev.map((g, gi) => ({
      ...g,
      metricIndices: gi === targetGi
        ? Array.from(new Set([...g.metricIndices, ...visibleIds])).sort((a, b) => a - b)
        : g.metricIndices.filter(m => !visibleIds.includes(m)),
    })))
  }

  const deselectAllForGroup = (targetGi: number, visibleIds: number[]) => {
    if (!parsed || visibleIds.length === 0) return
    const target = groups[targetGi]
    if (!target) return
    const idsInThisGroup = visibleIds.filter(id => target.metricIndices.includes(id))
    if (idsInThisGroup.length === 0) return
    setParsed({
      ...parsed,
      rows: parsed.rows.map((r, idx) => idsInThisGroup.includes(idx) ? { ...r, skipTest: true } : r),
    })
    setGroups(prev => prev.map((g, gi) => gi === targetGi
      ? { ...g, metricIndices: g.metricIndices.filter(m => !idsInThisGroup.includes(m)) }
      : g))
  }

  const toggleSkipTest = (mi: number) => {
    if (!parsed) return
    const row = parsed.rows[mi]
    if (row.type === 'no_test') return
    const next = !row.skipTest
    setParsed({
      ...parsed,
      rows: parsed.rows.map((r, idx) => idx === mi ? { ...r, skipTest: next } : r),
    })
    setGroups(prev => prev.map((g, gi) => {
      if (next) return { ...g, metricIndices: g.metricIndices.filter(m => m !== mi) }
      return gi === 0
        ? { ...g, metricIndices: Array.from(new Set([...g.metricIndices, mi])).sort((a, b) => a - b) }
        : g
    }))
  }

  const addGroup = () => {
    if (!parsed) return
    setGroups(prev => [...prev, { visitors: parsed.variantNames.map(() => 0), metricIndices: [], label: '', sourceMetricIndex: null }])
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

  const handleReset = () => {
    setParsed(null)
    setSheetSource(null)
    setParseError(null)
    setGroups([])
    setStdDevs([])
    setShowStdDev([])
  }

  const handleSubmit = (e: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
    e.preventDefault()
    if (!parsed || !sheetSource) return

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const confidence = Number((form.elements.namedItem('confidence_level') as HTMLInputElement).value)

    const errors: { name?: string; confidence_level?: string; visitors?: string; metrics?: string } = {}
    if (!name) errors.name = 'Experiment name is required.'
    if (confidence < 50 || confidence >= 100) errors.confidence_level = 'Confidence level must be between 50 and 99.9.'

    const activeGroups = groups.filter(g => g.metricIndices.length > 0)
    if (activeGroups.some(g => g.visitors.some(v => !v || v <= 0))) errors.visitors = 'All visitor counts must be greater than 0.'

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
      if (row.skipTest) {
        return {
          name: row.metric,
          type: row.type,
          values: row.values,
          visitors: parsed.variantNames.map(() => 0),
          format: row.format,
          tested: false,
        }
      }
      const group = activeGroups.find(g => g.metricIndices.includes(mi))
      if (!group) return null
      const sourceName = group.sourceMetricIndex !== null ? parsed.rows[group.sourceMetricIndex].metric : undefined
      const base: CsvMetricInput = {
        name: row.metric,
        type: row.type,
        values: row.values,
        visitors: group.visitors,
        format: row.format,
        ...(group.label ? { visitorGroupLabel: group.label } : {}),
        ...(sourceName ? { visitorSourceMetric: sourceName } : {}),
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
    if (metrics.some(m => m === null)) errors.visitors = 'Every tested metric must be assigned to a visitor group, or marked as Skip test.'

    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setSubmitError(null)
    startTransition(async () => {
      const result = await createExperimentsFromCsv({
        experimentName: name,
        variantNames: parsed.variantNames,
        metrics: metrics as CsvMetricInput[],
        confidenceLevel: confidence,
        sheetSource,
      })
      if (result?.error) setSubmitError(result.error)
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <Link href="/dashboard/experiments/new" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-bold mt-3">Connect Google Sheet</h1>
        <p className="text-sm text-foreground/50 mt-1">Paste the share link of a Google Sheet (set to &quot;Anyone with the link can view&quot;).</p>
      </div>

      {!parsed ? (
        <>
          <div className="flex flex-col gap-3 border border-foreground/15 rounded-xl p-5">
            <label htmlFor="sheet_url" className={labelClass}>Sheet URL</label>
            <input
              id="sheet_url"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowGidEditor(v => !v)}
              className="text-xs text-foreground/50 hover:text-foreground/70 transition-colors text-left"
            >
              {showGidEditor ? '− Use the tab from the URL' : '+ Pick a different tab'}
            </button>
            {showGidEditor && (
              <div className="flex flex-col gap-1">
                <label htmlFor="sheet_gid" className="text-xs text-foreground/50">Tab id (gid)</label>
                <input
                  id="sheet_gid"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="leave blank to use the URL"
                  value={gidOverride}
                  onChange={e => setGidOverride(e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-foreground/40 mt-0.5">
                  Find a tab&apos;s id in its URL: <span className="font-mono">…#gid=&lt;number&gt;</span>.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handleConnect}
              disabled={isFetching || !url.trim()}
              className="mt-2 self-start rounded-lg bg-brand text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isFetching ? 'Fetching…' : 'Connect sheet'}
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-foreground/10 p-4" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 3%, var(--background))' }}>
            <p className="text-xs font-medium text-foreground/50 mb-2">Expected layout</p>
            <pre className="text-xs text-foreground/60 font-mono leading-relaxed">{`measure_name,variant_a,variant_b\nConversion Rate,5.20,6.10\nRevenue per User,1.32,1.97`}</pre>
            <p className="text-xs text-foreground/40 mt-2">First column is the metric name. The data is imported once as a snapshot — re-pull from the experiment&apos;s edit page later to refresh.</p>
          </div>

          {parseError && <p className="mt-3 text-sm text-red-500">{parseError}</p>}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-2 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{parsed.rows.length} metric{parsed.rows.length !== 1 ? 's' : ''} detected</p>
                {sheetSource && (
                  <p className="text-xs text-foreground/45 truncate">
                    From <a href={sheetSource.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 underline decoration-dotted">sheet</a> · tab gid {sheetSource.gid}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-foreground/40 hover:text-foreground transition-colors shrink-0"
              >
                Connect different sheet
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
                    <Fragment key={i}>
                      <tr className="border-b border-foreground/8 last:border-0">
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
                          {row.type === 'continuous' && !row.skipTest && (
                            <button
                              type="button"
                              onClick={() => toggleStdDev(i)}
                              className="block mt-1.5 text-[11px] text-brand hover:opacity-75 transition-opacity"
                            >
                              {showStdDev[i] ? 'Hide std devs' : '+ Add std devs (optional)'}
                            </button>
                          )}
                          {row.type !== 'no_test' && (
                            <button
                              type="button"
                              onClick={() => toggleSkipTest(i)}
                              className="block mt-1.5 text-[11px] text-foreground/45 hover:text-foreground/70 transition-colors"
                            >
                              {row.skipTest ? '↺ Run test' : 'Skip test'}
                            </button>
                          )}
                          {row.type === 'no_test' && (
                            <p className="mt-1.5 text-[11px] text-foreground/40">No significance test</p>
                          )}
                          {row.skipTest && row.type !== 'no_test' && (
                            <p className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-500/80">No test (value only)</p>
                          )}
                        </td>
                        {row.values.map((val, j) => (
                          <td key={j} className="px-4 py-2.5 text-right text-foreground/70 align-top">
                            {fmtValue(val, row.format)}
                          </td>
                        ))}
                      </tr>
                      {row.type === 'continuous' && showStdDev[i] && (
                        <tr className="border-b border-foreground/8 last:border-0 bg-foreground/[0.015]">
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
                    </Fragment>
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
              {groups.map((group, gi) => {
                const eligibleSources = parsed.rows
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => row.type === 'no_test' && isEligibleVisitorSource(row.values))
                const isSourced = group.sourceMetricIndex !== null
                return (
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
                  {eligibleSources.length > 0 && (
                    <div className="flex items-center gap-2 -mt-1">
                      <span className="text-xs text-foreground/50 shrink-0">Source</span>
                      <select
                        value={group.sourceMetricIndex === null ? 'manual' : String(group.sourceMetricIndex)}
                        onChange={e => setGroupSource(gi, e.target.value === 'manual' ? null : Number(e.target.value))}
                        className="text-xs border border-foreground/15 rounded px-2 py-1 bg-background outline-none focus:border-foreground/35"
                      >
                        <option value="manual">Enter manually</option>
                        {eligibleSources.map(({ row, idx }) => (
                          <option key={idx} value={idx}>From &quot;{row.metric}&quot;</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {parsed.variantNames.map((vName, vi) => (
                      <div key={vi} className="flex items-center gap-3">
                        <span className="text-sm text-foreground/60 w-32 shrink-0 truncate">{vName}</span>
                        <input
                          type="number"
                          min="1"
                          required={group.metricIndices.length > 0 && !isSourced}
                          placeholder="e.g. 10000"
                          value={group.visitors[vi] || ''}
                          onChange={e => updateGroupVisitor(gi, vi, Number(e.target.value))}
                          disabled={isSourced}
                          className={`${inputClass} ${isSourced ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                  {parsed.rows.some(r => r.type !== 'no_test') && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <p className="text-xs text-foreground/50">Metrics in this group</p>
                      <MetricMultiSelect
                        options={parsed.rows
                          .map((row, mi) => ({ row, mi }))
                          .filter(({ row }) => row.type !== 'no_test')
                          .map(({ row, mi }) => ({
                            id: mi,
                            label: row.metric,
                            checked: group.metricIndices.includes(mi),
                          }))}
                        onToggle={(mi, checked) => setMetricCheckedForGroup(mi, gi, checked)}
                        onSelectAll={ids => selectAllForGroup(gi, ids)}
                        onDeselectAll={ids => deselectAllForGroup(gi, ids)}
                        placeholder="No testable metrics"
                      />
                    </div>
                  )}
                </div>
                )
              })}
              {groups.length < parsed.rows.filter(r => r.type !== 'no_test' && !r.skipTest).length && (
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
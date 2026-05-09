'use client'

import { Fragment, useState, useTransition } from 'react'
import { updateCsvExperiment } from '@/lib/actions/experiments'
import type { Experiment, MetricKind } from '@/types/experiment'
import type { CsvMetricInput } from '@/lib/actions/experiments.types'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

type MetricRow = {
  name: string
  type: MetricKind
  values: number[]              // rates 0..100 for binomial, means for continuous
  stdDevs: string[]             // string inputs (so blank = Poisson)
  showStdDev: boolean
  groupId: number
  format?: string               // display format preserved from original upload
}
type VisitorGroup = { id: number; visitors: number[]; label: string }

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function initState(experiment: Experiment) {
  const props = experiment.properties
  const numVariants = props.variant_names.length
  const numMetrics = props.metric_names.length
  const groups: VisitorGroup[] = []
  let nextId = 1

  // First pass: only build groups from testable metrics. No-test metrics
  // don't have meaningful visitor counts, so deferring them avoids creating
  // a stale all-zero placeholder when a no-test row comes before any testable row.
  const pendingGroupIds: (number | null)[] = new Array(numMetrics).fill(null)
  for (let m = 0; m < numMetrics; m++) {
    const type: MetricKind = props.metric_types[m] ?? 'binomial'
    if (type === 'no_test') continue
    const label = props.visitor_group_labels[m] ?? ''
    const visitors = Array.from({ length: numVariants }, (_, i) => props.N[i]?.[m] ?? 0)
    const existing = groups.find(g => arraysEqual(g.visitors, visitors) && g.label === label)
    if (existing) {
      pendingGroupIds[m] = existing.id
    } else {
      const id = nextId++
      groups.push({ id, visitors: [...visitors], label })
      pendingGroupIds[m] = id
    }
  }

  // If every metric is no_test, we still need a placeholder group so the form has somewhere to anchor.
  if (groups.length === 0) {
    groups.push({ id: nextId++, visitors: new Array(numVariants).fill(0), label: '' })
  }

  // Second pass: build metric rows; no_test rows borrow the first group's id as a placeholder.
  const metrics: MetricRow[] = []
  for (let m = 0; m < numMetrics; m++) {
    const type: MetricKind = props.metric_types[m] ?? 'binomial'
    const values = Array.from({ length: numVariants }, (_, i) => {
      const raw = props.metric_values[i]?.[m] ?? 0
      return type === 'binomial' ? raw * 100 : raw
    })
    const stdDevs = Array.from({ length: numVariants }, (_, i) => {
      const raw = props.std_dev?.[i]?.[m]
      return raw == null ? '' : String(raw)
    })
    const showStdDev = type === 'continuous' && stdDevs.some(s => s !== '')
    const groupId = pendingGroupIds[m] ?? groups[0].id
    metrics.push({ name: props.metric_names[m], type, values, stdDevs, showStdDev, groupId, format: props.metric_formats?.[m] })
  }

  return { groups, metrics, nextId }
}

export default function CsvEditForm({ experiment }: { experiment: Experiment }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; confidence_level?: string; variants?: string; visitors?: string; metrics?: string }>({})
  const [variantNames, setVariantNames] = useState(experiment.properties.variant_names)
  const initial = useState(() => initState(experiment))[0]
  const [groups, setGroups] = useState<VisitorGroup[]>(initial.groups)
  const [metrics, setMetrics] = useState<MetricRow[]>(initial.metrics)
  const [nextGroupId, setNextGroupId] = useState(initial.nextId)

  const updateVariantName = (i: number, val: string) =>
    setVariantNames(prev => prev.map((n, idx) => idx === i ? val : n))

  const updateMetricName = (mi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) => idx === mi ? { ...m, name: val } : m))

  const updateMetricValue = (mi: number, vi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) =>
      idx === mi ? { ...m, values: m.values.map((r, ri) => ri === vi ? (parseFloat(val) || 0) : r) } : m
    ))

  const updateMetricStdDev = (mi: number, vi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) =>
      idx === mi ? { ...m, stdDevs: m.stdDevs.map((s, si) => si === vi ? val : s) } : m
    ))

  const setMetricType = (mi: number, type: MetricKind) =>
    setMetrics(prev => prev.map((m, idx) => {
      if (idx !== mi) return m
      const groupId = type !== 'no_test' && m.type === 'no_test' ? (groups[0]?.id ?? m.groupId) : m.groupId
      return { ...m, type, showStdDev: type === 'continuous' && m.showStdDev, groupId }
    }))

  const toggleStdDev = (mi: number) =>
    setMetrics(prev => prev.map((m, idx) => idx === mi ? { ...m, showStdDev: !m.showStdDev } : m))

  const addMetric = () =>
    setMetrics(prev => [...prev, {
      name: '',
      type: 'binomial',
      values: new Array(variantNames.length).fill(0),
      stdDevs: new Array(variantNames.length).fill(''),
      showStdDev: false,
      groupId: groups[0].id,
    }])

  const removeMetric = (i: number) =>
    setMetrics(prev => prev.filter((_, idx) => idx !== i))

  const updateGroupVisitor = (groupId: number, vi: number, val: number) =>
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, visitors: g.visitors.map((v, i) => i === vi ? val : v) }
      : g))

  const updateGroupLabel = (groupId: number, val: string) =>
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, label: val } : g))

  const moveMetricToGroup = (metricIdx: number, targetGroupId: number) =>
    setMetrics(prev => prev.map((m, idx) => idx === metricIdx ? { ...m, groupId: targetGroupId } : m))

  const addGroup = () => {
    const id = nextGroupId
    setNextGroupId(id + 1)
    setGroups(prev => [...prev, { id, visitors: new Array(variantNames.length).fill(0), label: '' }])
  }

  const removeGroup = (groupId: number) => {
    if (groups.length <= 1) return
    const fallbackId = groups.find(g => g.id !== groupId)!.id
    setMetrics(prev => prev.map(m => m.groupId === groupId ? { ...m, groupId: fallbackId } : m))
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const handleSubmit = (e: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const status = (form.elements.namedItem('status') as HTMLSelectElement).value
    const confidence = Number((form.elements.namedItem('confidence_level') as HTMLInputElement).value)

    const fe: { name?: string; confidence_level?: string; variants?: string; visitors?: string; metrics?: string } = {}
    if (!name) fe.name = 'Experiment name is required.'
    if (confidence < 50 || confidence >= 100) fe.confidence_level = 'Confidence level must be between 50 and 99.9.'
    if (variantNames.some(n => !n.trim())) fe.variants = 'All variant names are required.'
    if (metrics.length === 0) fe.variants = 'At least one metric is required.'
    if (metrics.some(m => !m.name.trim())) fe.variants = 'All metrics must have a name.'

    for (const m of metrics) {
      if (m.type === 'no_test' && m.values.some(v => isNaN(v))) {
        fe.metrics = `"${m.name || 'metric'}" values must be numbers.`
        break
      }
      if (m.type === 'binomial' && m.values.some(r => isNaN(r) || r < 0 || r > 100)) {
        fe.metrics = `"${m.name || 'metric'}" rates must be between 0 and 100.`
        break
      }
      if (m.type === 'continuous' && m.values.some(v => isNaN(v) || v <= 0)) {
        fe.metrics = `"${m.name || 'metric'}" means must be positive.`
        break
      }
      if (m.type === 'continuous') {
        for (const sd of m.stdDevs) {
          const t = sd.trim()
          if (t === '') continue
          const n = Number(t)
          if (!Number.isFinite(n) || n <= 0) {
            fe.metrics = `"${m.name || 'metric'}" std dev must be greater than 0.`
            break
          }
        }
        if (fe.metrics) break
      }
    }

    const activeGroupIds = new Set(metrics.filter(m => m.type !== 'no_test').map(m => m.groupId))
    const activeGroups = groups.filter(g => activeGroupIds.has(g.id))
    if (activeGroups.some(g => g.visitors.some(v => !v || v <= 0)))
      fe.visitors = 'All visitor counts must be greater than 0.'

    if (Object.keys(fe).length > 0) { setFieldErrors(fe); return }
    setFieldErrors({})

    const metricsPayload: CsvMetricInput[] = metrics.map(m => {
      if (m.type === 'no_test') {
        return {
          name: m.name,
          type: 'no_test',
          values: m.values,
          visitors: variantNames.map(() => 0),
          ...(m.format ? { format: m.format } : {}),
        }
      }
      const group = groups.find(g => g.id === m.groupId)!
      const base: CsvMetricInput = {
        name: m.name,
        type: m.type,
        values: m.values,
        visitors: group.visitors,
        ...(m.format ? { format: m.format } : {}),
        ...(group.label ? { visitorGroupLabel: group.label } : {}),
      }
      if (m.type === 'continuous') {
        base.std_devs = m.stdDevs.map(s => {
          const t = s.trim()
          if (t === '') return null
          const n = Number(t)
          return Number.isFinite(n) && n > 0 ? n : null
        })
      }
      return base
    })

    setError(null)
    startTransition(async () => {
      const result = await updateCsvExperiment(experiment.id, {
        name,
        status,
        variantNames,
        metrics: metricsPayload,
        confidenceLevel: confidence,
      })
      if (result?.error) setError(result.error)
    })
  }

  const showGroupAssignment = groups.length > 1

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>Experiment name</label>
        <input id="name" name="name" type="text" required defaultValue={experiment.name} className={inputClass} />
        {fieldErrors.name && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className={labelClass}>Status</label>
        <select id="status" name="status" defaultValue={experiment.status} className={inputClass}>
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="concluded">Concluded</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Variants</label>
        {variantNames.map((vName, i) => (
          <div key={i} className="border border-foreground/10 rounded-xl p-4">
            <input
              type="text"
              value={vName}
              onChange={e => updateVariantName(i, e.target.value)}
              placeholder={`Variant ${i + 1}`}
              className="text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-foreground/20 transition-colors w-full"
            />
          </div>
        ))}
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
            const metricsInGroup = metrics.filter(m => m.groupId === group.id && m.type !== 'no_test')
            return (
              <div key={group.id} className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={group.label}
                    onChange={e => updateGroupLabel(group.id, e.target.value)}
                    placeholder={groups.length === 1 ? 'Group name (optional)' : `Group ${gi + 1}`}
                    className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-foreground/20 transition-colors placeholder:font-normal placeholder:text-foreground/30"
                  />
                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      className="text-xs text-foreground/40 hover:text-red-500 transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {variantNames.map((vName, vi) => (
                    <div key={vi} className="flex items-center gap-3">
                      <span className="text-sm text-foreground/60 w-32 shrink-0 truncate">{vName || `Variant ${vi + 1}`}</span>
                      <input
                        type="number"
                        min="1"
                        required={metricsInGroup.length > 0}
                        value={group.visitors[vi] || ''}
                        onChange={e => updateGroupVisitor(group.id, vi, Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
                {showGroupAssignment && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="text-xs text-foreground/50">
                      Applies to {metricsInGroup.length === 0 ? 'no metrics yet' : `${metricsInGroup.length} metric${metricsInGroup.length !== 1 ? 's' : ''}`}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {metrics.map((m, mi) => {
                        if (m.type === 'no_test') return null
                        const isHere = m.groupId === group.id
                        return (
                          <button
                            key={mi}
                            type="button"
                            onClick={() => moveMetricToGroup(mi, group.id)}
                            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                              isHere
                                ? 'border-brand bg-brand/10 text-foreground'
                                : 'border-foreground/15 text-foreground/50 hover:border-foreground/35 hover:text-foreground/70'
                            }`}
                          >
                            {m.name || `Metric ${mi + 1}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {groups.length < Math.max(metrics.filter(m => m.type !== 'no_test').length, 1) && (
            <button
              type="button"
              onClick={addGroup}
              className="text-sm text-brand hover:opacity-75 transition-opacity text-left"
            >
              + Add visitor group
            </button>
          )}
          {fieldErrors.visitors && <p className="text-sm text-red-500">{fieldErrors.visitors}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass}>Metrics</label>
        <div className="border border-foreground/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, var(--background))' }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground/50">Metric</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-foreground/50">Type</th>
                {variantNames.map((n, i) => (
                  <th key={i} className="text-right px-4 py-2.5 text-xs font-medium text-foreground/50">{n || `Variant ${i + 1}`}</th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, mi) => (
                <Fragment key={mi}>
                  <tr className="border-b border-foreground/5 last:border-0">
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        value={m.name}
                        placeholder="Metric name"
                        onChange={e => updateMetricName(mi, e.target.value)}
                        className="w-full bg-transparent outline-none border border-transparent rounded px-2 py-1 focus:border-foreground/20 text-sm transition-colors"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="inline-flex p-0.5 rounded-md border border-foreground/15 bg-foreground/[0.02]">
                        <button
                          type="button"
                          onClick={() => setMetricType(mi, 'binomial')}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                            m.type === 'binomial' ? 'bg-background text-foreground shadow-sm' : 'text-foreground/45 hover:text-foreground/70'
                          }`}
                        >
                          Binomial
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetricType(mi, 'continuous')}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                            m.type === 'continuous' ? 'bg-background text-foreground shadow-sm' : 'text-foreground/45 hover:text-foreground/70'
                          }`}
                        >
                          Continuous
                        </button>
                        <button
                          type="button"
                          onClick={() => setMetricType(mi, 'no_test')}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-all ${
                            m.type === 'no_test' ? 'bg-background text-foreground shadow-sm' : 'text-foreground/45 hover:text-foreground/70'
                          }`}
                          title="No statistical test will be applied"
                        >
                          No test
                        </button>
                      </div>
                      {m.type === 'continuous' && (
                        <button
                          type="button"
                          onClick={() => toggleStdDev(mi)}
                          className="block mt-1.5 text-[11px] text-brand hover:opacity-75 transition-opacity"
                        >
                          {m.showStdDev ? 'Hide std devs' : '+ Add std devs'}
                        </button>
                      )}
                      {m.type === 'no_test' && (
                        <p className="mt-1.5 text-[11px] text-foreground/40">No significance test</p>
                      )}
                    </td>
                    {m.values.map((val, vi) => (
                      <td key={vi} className="px-2 py-1.5 align-top">
                        <input
                          type="number" step="any" min="0"
                          value={val}
                          onChange={e => updateMetricValue(mi, vi, e.target.value)}
                          className="w-20 bg-transparent outline-none border border-transparent rounded px-2 py-1 focus:border-foreground/20 text-sm text-right transition-colors"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center align-top">
                      {metrics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMetric(mi)}
                          className="text-foreground/30 hover:text-red-500 transition-colors text-xs leading-none"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                  {m.type === 'continuous' && m.showStdDev && (
                    <tr className="border-b border-foreground/5 last:border-0 bg-foreground/[0.015]">
                      <td className="px-4 py-2 text-xs text-foreground/50 font-medium" colSpan={2}>
                        ↳ Std dev <span className="text-foreground/30 font-normal">(blank = Poisson)</span>
                      </td>
                      {m.stdDevs.map((sd, vi) => (
                        <td key={vi} className="px-2 py-1.5">
                          <input
                            type="number" step="any" min="0"
                            value={sd}
                            placeholder="auto"
                            onChange={e => updateMetricStdDev(mi, vi, e.target.value)}
                            className="w-20 bg-transparent outline-none border border-foreground/15 rounded px-2 py-1 focus:border-foreground/35 text-xs text-right transition-colors"
                          />
                        </td>
                      ))}
                      <td />
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addMetric}
          className="text-sm text-brand hover:opacity-75 transition-opacity text-left"
        >
          + Add metric
        </button>
        {fieldErrors.variants && <p className="text-sm text-red-500">{fieldErrors.variants}</p>}
        {fieldErrors.metrics && <p className="text-sm text-red-500">{fieldErrors.metrics}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confidence_level" className={labelClass}>Confidence level (%)</label>
        <input
          id="confidence_level" name="confidence_level" type="number"
          min="50" max="99.9" step="0.1" required
          defaultValue={experiment.confidence_level * 100}
          className={inputClass}
        />
        <p className="text-xs text-foreground/40 mt-0.5">How certain you want to be before calling a winner.</p>
        {fieldErrors.confidence_level && <p className="text-xs text-red-500 mt-0.5">{fieldErrors.confidence_level}</p>}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <SubmitButton pending={isPending} label="Save changes" pendingLabel="Saving..." />
    </form>
  )
}
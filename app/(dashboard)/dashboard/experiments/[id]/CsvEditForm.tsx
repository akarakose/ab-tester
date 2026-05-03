'use client'

import { useState, useTransition } from 'react'
import { updateCsvExperiment } from '@/lib/actions/experiments'
import type { Experiment } from '@/types/experiment'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

type MetricRow = { name: string; rates: number[]; groupId: number }
type VisitorGroup = { id: number; visitors: number[]; label: string }

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function initState(experiment: Experiment) {
  const props = experiment.properties
  const numVariants = props.variant_names.length
  const numMetrics = props.metric_names.length
  const groups: VisitorGroup[] = []
  const metrics: MetricRow[] = []
  let nextId = 1

  for (let m = 0; m < numMetrics; m++) {
    const visitors = Array.from({ length: numVariants }, (_, i) => props.N[i]?.[m] ?? 0)
    const rates = Array.from({ length: numVariants }, (_, i) => (props.metric_values[i]?.[m] ?? 0) * 100)
    const label = props.visitor_group_labels[m] ?? ''
    const existing = groups.find(g => arraysEqual(g.visitors, visitors) && g.label === label)
    const groupId = existing ? existing.id : (() => {
      const id = nextId++
      groups.push({ id, visitors: [...visitors], label })
      return id
    })()
    metrics.push({ name: props.metric_names[m], rates, groupId })
  }

  if (groups.length === 0) {
    groups.push({ id: nextId++, visitors: new Array(numVariants).fill(0), label: '' })
  }

  return { groups, metrics, nextId }
}

export default function CsvEditForm({ experiment }: { experiment: Experiment }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; confidence_level?: string; variants?: string; visitors?: string }>({})
  const [variantNames, setVariantNames] = useState(experiment.properties.variant_names)
  const initial = useState(() => initState(experiment))[0]
  const [groups, setGroups] = useState<VisitorGroup[]>(initial.groups)
  const [metrics, setMetrics] = useState<MetricRow[]>(initial.metrics)
  const [nextGroupId, setNextGroupId] = useState(initial.nextId)

  const updateVariantName = (i: number, val: string) =>
    setVariantNames(prev => prev.map((n, idx) => idx === i ? val : n))

  const updateMetricName = (mi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) => idx === mi ? { ...m, name: val } : m))

  const updateMetricRate = (mi: number, vi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) =>
      idx === mi ? { ...m, rates: m.rates.map((r, ri) => ri === vi ? (parseFloat(val) || 0) : r) } : m
    ))

  const addMetric = () =>
    setMetrics(prev => [...prev, { name: '', rates: new Array(variantNames.length).fill(0), groupId: groups[0].id }])

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

    const fe: { name?: string; confidence_level?: string; variants?: string; visitors?: string } = {}
    if (!name) fe.name = 'Experiment name is required.'
    if (confidence < 50 || confidence >= 100) fe.confidence_level = 'Confidence level must be between 50 and 99.9.'
    if (variantNames.some(n => !n.trim())) fe.variants = 'All variant names are required.'
    if (metrics.length === 0) fe.variants = 'At least one metric is required.'
    if (metrics.some(m => !m.name.trim())) fe.variants = 'All metrics must have a name.'
    if (metrics.some(m => m.rates.some(r => isNaN(r) || r < 0 || r > 100)))
      fe.variants = 'All metric values must be percentages between 0 and 100.'

    const activeGroupIds = new Set(metrics.map(m => m.groupId))
    const activeGroups = groups.filter(g => activeGroupIds.has(g.id))
    if (activeGroups.some(g => g.visitors.some(v => !v || v <= 0)))
      fe.visitors = 'All visitor counts must be greater than 0.'

    if (Object.keys(fe).length > 0) { setFieldErrors(fe); return }
    setFieldErrors({})

    const metricsPayload = metrics.map(m => {
      const group = groups.find(g => g.id === m.groupId)!
      return { name: m.name, rates: m.rates, visitors: group.visitors, visitorGroupLabel: group.label || undefined }
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
          <label className={labelClass}>Visitors per variant</label>
          <p className="text-xs text-foreground/40">
            {groups.length === 1 ? 'Same visitors for all metrics' : `${groups.length} groups`}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {groups.map((group, gi) => {
            const metricsInGroup = metrics.filter(m => m.groupId === group.id)
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
                        required
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
          {groups.length < Math.max(metrics.length, 1) && (
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
        <label className={labelClass}>Metrics (%)</label>
        <div className="border border-foreground/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10" style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, var(--background))' }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground/50">Metric</th>
                {variantNames.map((n, i) => (
                  <th key={i} className="text-right px-4 py-2.5 text-xs font-medium text-foreground/50">{n || `Variant ${i + 1}`}</th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, mi) => (
                <tr key={mi} className="border-b border-foreground/5 last:border-0">
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={m.name}
                      placeholder="Metric name"
                      onChange={e => updateMetricName(mi, e.target.value)}
                      className="w-full bg-transparent outline-none border border-transparent rounded px-2 py-1 focus:border-foreground/20 text-sm transition-colors"
                    />
                  </td>
                  {m.rates.map((rate, vi) => (
                    <td key={vi} className="px-2 py-1.5">
                      <input
                        type="number" min="0" max="100" step="0.01"
                        value={rate}
                        onChange={e => updateMetricRate(mi, vi, e.target.value)}
                        className="w-20 bg-transparent outline-none border border-transparent rounded px-2 py-1 focus:border-foreground/20 text-sm text-right transition-colors"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
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
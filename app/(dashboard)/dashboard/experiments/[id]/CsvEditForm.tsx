'use client'

import { useState, useTransition } from 'react'
import { updateCsvExperiment } from '@/lib/actions/experiments'
import type { Experiment } from '@/types/experiment'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

type MetricRow = { name: string; rates: number[] }

export default function CsvEditForm({ experiment }: { experiment: Experiment }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [variantNames, setVariantNames] = useState(experiment.variants.map(v => v.name))
  const [visitors, setVisitors] = useState(experiment.variants.map(v => v.visitors))
  const [metrics, setMetrics] = useState<MetricRow[]>(
    experiment.metrics!.map(m => ({ name: m.name, rates: [...m.rates] }))
  )

  const updateVariantName = (i: number, val: string) =>
    setVariantNames(prev => prev.map((n, idx) => idx === i ? val : n))

  const updateVisitors = (i: number, val: number) =>
    setVisitors(prev => prev.map((v, idx) => idx === i ? val : v))

  const updateMetricName = (mi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) => idx === mi ? { ...m, name: val } : m))

  const updateMetricRate = (mi: number, vi: number, val: string) =>
    setMetrics(prev => prev.map((m, idx) =>
      idx === mi ? { ...m, rates: m.rates.map((r, ri) => ri === vi ? (parseFloat(val) || 0) : r) } : m
    ))

  const addMetric = () =>
    setMetrics(prev => [...prev, { name: '', rates: new Array(variantNames.length).fill(0) }])

  const removeMetric = (i: number) =>
    setMetrics(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = (e: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
    e.preventDefault()
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const status = (form.elements.namedItem('status') as HTMLSelectElement).value
    const confidence = Number((form.elements.namedItem('confidence_level') as HTMLInputElement).value)

    if (!name) { setError('Experiment name is required.'); return }
    if (confidence < 50 || confidence >= 100) { setError('Confidence level must be between 50 and 99.9.'); return }
    if (variantNames.some(n => !n.trim())) { setError('All variant names are required.'); return }
    if (visitors.some(v => !v || v <= 0)) { setError('All visitor counts must be greater than 0.'); return }
    if (metrics.length === 0) { setError('At least one metric is required.'); return }
    if (metrics.some(m => !m.name.trim())) { setError('All metrics must have a name.'); return }
    if (metrics.some(m => m.rates.some(r => isNaN(r) || r < 0 || r > 100))) {
      setError('All metric values must be percentages between 0 and 100.')
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateCsvExperiment(experiment.id, {
        name,
        status,
        variantNames,
        visitors,
        metrics,
        confidenceLevel: confidence,
      })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>Experiment name</label>
        <input id="name" name="name" type="text" required defaultValue={experiment.name} className={inputClass} />
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
          <div key={i} className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-3">
            <input
              type="text"
              value={vName}
              onChange={e => updateVariantName(i, e.target.value)}
              placeholder={`Variant ${i + 1}`}
              className="text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-foreground/20 transition-colors"
            />
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Visitors</label>
              <input
                type="number" min="1" required
                value={visitors[i]}
                onChange={e => updateVisitors(i, Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
        ))}
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
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <SubmitButton pending={isPending} label="Save changes" pendingLabel="Saving..." />
    </form>
  )
}
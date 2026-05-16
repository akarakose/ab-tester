'use client'

import { useActionState, useState } from 'react'
import { createExperiment } from '@/lib/actions/experiments'
import Link from 'next/link'
import SubmitButton from '@/components/ui/SubmitButton'

type ToggleValue = 'binomial' | 'continuous'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

const DEFAULT_VARIANTS = [
  { name: 'Control' },
  { name: 'Variant A' },
]

export default function NewExperimentPage() {
  const [state, formAction, pending] = useActionState(createExperiment, undefined)
  const [variantCount, setVariantCount] = useState(DEFAULT_VARIANTS.length)
  const [metricType, setToggleValue] = useState<ToggleValue>('binomial')
  const [formKey, setFormKey] = useState(0)

  const switchToggleValue = (next: ToggleValue) => {
    if (next === metricType) return
    setToggleValue(next)
    setVariantCount(DEFAULT_VARIANTS.length)
    setFormKey(k => k + 1)
  }

  const addVariant = () => {
    if (variantCount >= 6) return
    setVariantCount(c => c + 1)
  }

  const removeVariant = () => {
    if (variantCount <= 2) return
    setVariantCount(c => c - 1)
  }

  const getDefaultName = (index: number) => {
    if (index === 0) return 'Control'
    return `Variant ${String.fromCharCode(64 + index)}`
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/dashboard/experiments/new" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
          ← Back
        </Link>
        <h1 className="text-xl font-bold mt-3">New experiment</h1>
        <p className="text-sm text-foreground/50 mt-1">Enter your A/B test data to calculate significance.</p>
      </div>

      <form key={formKey} action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="variant_count" value={variantCount} />
        <input type="hidden" name="metric_type" value={metricType} />

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className={labelClass}>Experiment name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Homepage CTA button colour"
            className={inputClass}
          />
          {state?.fieldErrors?.name && (
            <p className="text-xs text-red-500 mt-0.5">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Metric type</label>
          <div className="inline-flex p-0.5 rounded-lg border border-foreground/15 bg-foreground/[0.02] w-fit">
            <button
              type="button"
              onClick={() => switchToggleValue('binomial')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                metricType === 'binomial'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/50 hover:text-foreground/80'
              }`}
            >
              Conversion rate
            </button>
            <button
              type="button"
              onClick={() => switchToggleValue('continuous')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                metricType === 'continuous'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/50 hover:text-foreground/80'
              }`}
            >
              Continuous metric
            </button>
          </div>
        </div>

        {metricType === 'continuous' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="metric_name" className={labelClass}>Metric name</label>
            <input
              id="metric_name"
              name="metric_name"
              type="text"
              required
              placeholder="Revenue per user"
              className={inputClass}
            />
            <p className="text-xs text-foreground/40 mt-0.5">e.g. &quot;Revenue per user&quot;, &quot;Messages sent per user&quot;</p>
            {state?.fieldErrors?.metric_name && (
              <p className="text-xs text-red-500 mt-0.5">{state.fieldErrors.metric_name}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {Array.from({ length: variantCount }).map((_, i) => (
            <div key={i} className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <input
                  name={`variant_name_${i}`}
                  type="text"
                  required
                  defaultValue={getDefaultName(i)}
                  placeholder={getDefaultName(i)}
                  className="text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-foreground/20 transition-colors"
                />
                {i === variantCount - 1 && i >= 2 && (
                  <button
                    type="button"
                    onClick={removeVariant}
                    className="text-xs text-foreground/40 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              {metricType === 'binomial' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Visitors</label>
                    <input
                      name={`variant_visitors_${i}`}
                      type="number"
                      min="1"
                      required
                      placeholder="1000"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Conversions</label>
                    <input
                      name={`variant_conversions_${i}`}
                      type="number"
                      min="0"
                      required
                      placeholder={i === 0 ? '50' : '65'}
                      className={inputClass}
                    />
                  </div>
                </div>
              ) : (
                <ContinuousVariantFields index={i} />
              )}
            </div>
          ))}
        </div>

        {variantCount < 6 && (
          <button
            type="button"
            onClick={addVariant}
            className="text-sm text-brand hover:opacity-75 transition-opacity text-left"
          >
            + Add variant
          </button>
        )}

        {state?.fieldErrors?.variants && (
          <p className="text-sm text-red-500">{state.fieldErrors.variants}</p>
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
          {state?.fieldErrors?.confidence_level && (
            <p className="text-xs text-red-500 mt-0.5">{state.fieldErrors.confidence_level}</p>
          )}
        </div>

        {state?.error && (
          <p className="text-sm text-red-500">{state.error}</p>
        )}

        <SubmitButton pending={pending} label="Create experiment" pendingLabel="Creating..." />
      </form>
    </div>
  )
}

function ContinuousVariantFields({ index }: { index: number }) {
  const [stdDev, setStdDev] = useState('')
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Mean</label>
        <input
          name={`variant_mean_${index}`}
          type="number"
          step="any"
          min="0"
          required
          placeholder="1.32"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass} title="Std dev not provided. We'll estimate it as √mean. Less accurate for revenue or high-variance metrics.">
          Std dev
          <span className="text-foreground/40 font-normal ml-1">(optional)</span>
        </label>
        <input
          name={`variant_std_dev_${index}`}
          type="number"
          step="any"
          min="0"
          value={stdDev}
          onChange={e => setStdDev(e.target.value)}
          placeholder="optional"
          className={inputClass}
        />
        {stdDev.trim() === '' && (
          <p
            className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5 leading-tight"
            title="Std dev not provided. We'll estimate it as √mean. Less accurate for revenue or high-variance metrics."
          >
            ⚠ Using Poisson approximation
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Sample size</label>
        <input
          name={`variant_sample_size_${index}`}
          type="number"
          min="2"
          step="1"
          required
          placeholder="1000"
          className={inputClass}
        />
      </div>
    </div>
  )
}
'use client'

import { useActionState, useState } from 'react'
import { updateExperiment } from '@/lib/actions/experiments'
import type { Experiment, Properties } from '@/types/experiment'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

export default function EditForm({ experiment }: { experiment: Experiment }) {
  const updateWithId = updateExperiment.bind(null, experiment.id)
  const [state, formAction, pending] = useActionState(updateWithId, undefined)
  const props = experiment.properties
  const [variantCount, setVariantCount] = useState(props.variant_names.length)

  const isContinuous = props.experiment_type === 'continuous_single'

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
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="variant_count" value={variantCount} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>Experiment name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={experiment.name}
          className={inputClass}
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-red-500 mt-0.5">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className={labelClass}>Status</label>
        <select
          id="status"
          name="status"
          defaultValue={experiment.status}
          className={inputClass}
        >
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="concluded">Concluded</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Metric type</label>
        <div
          className="inline-flex p-0.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] w-fit opacity-70 cursor-not-allowed"
          title="Metric type cannot be changed after creation"
        >
          <span className={`px-3 py-1.5 text-xs font-medium rounded-md ${!isContinuous ? 'bg-background text-foreground shadow-sm' : 'text-foreground/40'}`}>
            Conversion rate
          </span>
          <span className={`px-3 py-1.5 text-xs font-medium rounded-md ${isContinuous ? 'bg-background text-foreground shadow-sm' : 'text-foreground/40'}`}>
            Continuous metric
          </span>
        </div>
        <p className="text-xs text-foreground/40">Locked after creation.</p>
      </div>

      {isContinuous && (
        <div className="flex flex-col gap-1">
          <label htmlFor="metric_name" className={labelClass}>Metric name</label>
          <input
            id="metric_name"
            name="metric_name"
            type="text"
            required
            defaultValue={props.metric_names[0] ?? ''}
            className={inputClass}
          />
          {state?.fieldErrors?.metric_name && (
            <p className="text-xs text-red-500 mt-0.5">{state.fieldErrors.metric_name}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {Array.from({ length: variantCount }).map((_, i) => {
          const savedName = props.variant_names[i]
          return (
            <div key={i} className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <input
                  name={`variant_name_${i}`}
                  type="text"
                  required
                  defaultValue={savedName ?? getDefaultName(i)}
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
              {isContinuous ? (
                <ContinuousVariantFields index={i} props={props} />
              ) : (
                <BinomialVariantFields index={i} props={props} />
              )}
            </div>
          )
        })}
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
          required
          defaultValue={experiment.confidence_level * 100}
          className={inputClass}
        />
        {state?.fieldErrors?.confidence_level && (
          <p className="text-xs text-red-500 mt-0.5">{state.fieldErrors.confidence_level}</p>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <SubmitButton pending={pending} label="Save changes" pendingLabel="Saving..." />
    </form>
  )
}

function BinomialVariantFields({ index, props }: { index: number; props: Properties }) {
  const visitors = props.N[index]?.[0]
  const rate = props.metric_values[index]?.[0]
  const conversions = visitors !== undefined && rate !== undefined ? Math.round(rate * visitors) : undefined
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Visitors</label>
        <input
          name={`variant_visitors_${index}`}
          type="number"
          min="1"
          required
          defaultValue={visitors ?? ''}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Conversions</label>
        <input
          name={`variant_conversions_${index}`}
          type="number"
          min="0"
          required
          defaultValue={conversions ?? ''}
          className={inputClass}
        />
      </div>
    </div>
  )
}

function ContinuousVariantFields({ index, props }: { index: number; props: Properties }) {
  const savedStdDev = props.std_dev?.[index]?.[0]
  const initialStdDev = savedStdDev === null || savedStdDev === undefined ? '' : String(savedStdDev)
  const [stdDev, setStdDev] = useState(initialStdDev)
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Mean</label>
        <input
          name={`variant_mean_${index}`}
          type="number"
          step="any"
          min="0"
          required
          defaultValue={props.metric_values[index]?.[0] ?? ''}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>
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
          defaultValue={props.N[index]?.[0] ?? ''}
          className={inputClass}
        />
      </div>
    </div>
  )
}
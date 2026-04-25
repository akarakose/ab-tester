'use client'

import { useActionState, useState } from 'react'
import { updateExperiment } from '@/lib/actions/experiments'
import type { Experiment } from '@/types/experiment'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

export default function EditForm({ experiment }: { experiment: Experiment }) {
  const updateWithId = updateExperiment.bind(null, experiment.id)
  const [state, formAction, pending] = useActionState(updateWithId, undefined)
  const [variantCount, setVariantCount] = useState(experiment.variants.length)

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

      <div className="flex flex-col gap-3">
        {Array.from({ length: variantCount }).map((_, i) => {
          const saved = experiment.variants[i]
          return (
            <div key={i} className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <input
                  name={`variant_name_${i}`}
                  type="text"
                  required
                  defaultValue={saved?.name ?? getDefaultName(i)}
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
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Visitors</label>
                  <input
                    name={`variant_visitors_${i}`}
                    type="number"
                    min="1"
                    required
                    defaultValue={saved?.visitors}
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
                    defaultValue={saved?.conversions}
                    className={inputClass}
                  />
                </div>
              </div>
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
      </div>

      {state?.error && (
        <p className="text-sm text-red-500">{state.error}</p>
      )}

      <SubmitButton pending={pending} label="Save changes" pendingLabel="Saving..." />
    </form>
  )
}
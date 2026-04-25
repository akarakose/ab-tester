'use client'

import { useActionState, useState } from 'react'
import { createExperiment } from '@/lib/actions/experiments'
import Link from 'next/link'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

const DEFAULT_VARIANTS = [
  { name: 'Control' },
  { name: 'Variant A' },
]

export default function NewExperimentPage() {
  const [state, formAction, pending] = useActionState(createExperiment, undefined)
  const [variantCount, setVariantCount] = useState(DEFAULT_VARIANTS.length)

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
        <Link href="/dashboard/experiments" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
          ← Back to experiments
        </Link>
        <h1 className="text-xl font-bold mt-3">New experiment</h1>
        <p className="text-sm text-foreground/50 mt-1">Enter your A/B test data to calculate significance.</p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="variant_count" value={variantCount} />

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
        </div>

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
              <div className="grid grid-cols-2 gap-3">
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

        {state?.error && (
          <p className="text-sm text-red-500">{state.error}</p>
        )}

        <SubmitButton pending={pending} label="Create experiment" pendingLabel="Creating..." />
      </form>
    </div>
  )
}
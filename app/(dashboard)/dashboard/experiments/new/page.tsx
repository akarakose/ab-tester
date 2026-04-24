'use client'

import { useActionState } from 'react'
import { createExperiment } from '@/lib/actions/experiments'
import Link from 'next/link'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

export default function NewExperimentPage() {
  const [state, formAction, pending] = useActionState(createExperiment, undefined)

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

        <div className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-sm font-semibold">Control (original)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="control_visitors" className={labelClass}>Visitors</label>
              <input
                id="control_visitors"
                name="control_visitors"
                type="number"
                min="1"
                required
                placeholder="1000"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="control_conversions" className={labelClass}>Conversions</label>
              <input
                id="control_conversions"
                name="control_conversions"
                type="number"
                min="0"
                required
                placeholder="50"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="border border-foreground/10 rounded-xl p-4 flex flex-col gap-4">
          <p className="text-sm font-semibold">Variant (challenger)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="variant_visitors" className={labelClass}>Visitors</label>
              <input
                id="variant_visitors"
                name="variant_visitors"
                type="number"
                min="1"
                required
                placeholder="1000"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="variant_conversions" className={labelClass}>Conversions</label>
              <input
                id="variant_conversions"
                name="variant_conversions"
                type="number"
                min="0"
                required
                placeholder="65"
                className={inputClass}
              />
            </div>
          </div>
        </div>

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
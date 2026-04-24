'use client'

import { useActionState } from 'react'
import { updateExperiment } from '@/lib/actions/experiments'
import type { Experiment } from '@/types/experiment'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand w-full'
const labelClass = 'text-sm font-medium'

export default function EditForm({ experiment }: { experiment: Experiment }) {
  const updateWithId = updateExperiment.bind(null, experiment.id)
  const [state, formAction, pending] = useActionState(updateWithId, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
              defaultValue={experiment.control_visitors}
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
              defaultValue={experiment.control_conversions}
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
              defaultValue={experiment.variant_visitors}
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
              defaultValue={experiment.variant_conversions}
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
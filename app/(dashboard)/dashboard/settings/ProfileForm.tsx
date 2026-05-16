'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/lib/actions/account'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function ProfileForm({ initialCompanyName }: { initialCompanyName: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="company_name" className="text-sm font-medium">Company name</label>
        <input
          id="company_name"
          name="company_name"
          type="text"
          maxLength={80}
          defaultValue={initialCompanyName}
          placeholder="Acme Inc."
          className={inputClass}
        />
        {state?.fieldErrors?.company_name && (
          <p className="text-xs text-red-500">{state.fieldErrors.company_name}</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-500">{state.message}</p>}

      <div>
        <SubmitButton pending={pending} label="Save changes" pendingLabel="Saving..." />
      </div>
    </form>
  )
}
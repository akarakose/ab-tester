'use client'

import { useActionState } from 'react'
import { updateEmail } from '@/lib/actions/account'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState(updateEmail, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">New email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={currentEmail || 'you@example.com'}
          className={inputClass}
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-red-500">{state.fieldErrors.email}</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-500">{state.message}</p>}

      <div>
        <SubmitButton pending={pending} label="Send confirmation" pendingLabel="Sending..." />
      </div>
    </form>
  )
}
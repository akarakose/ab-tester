'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { updateProfile } from '@/lib/actions/account'
import Spinner from '@/components/ui/Spinner'

const inputClass = 'border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function CompanyNameEditor({ initialCompanyName }: { initialCompanyName: string }) {
  const [displayed, setDisplayed] = useState(initialCompanyName)
  const [editing, setEditing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(updateProfile, undefined)

  // Sync the displayed value from the just-submitted form on success, then collapse.
  // Depending on the whole `state` object (not just .message) ensures repeat submits
  // with identical messages still re-fire this effect.
  useEffect(() => {
    if (state?.message && formRef.current) {
      const fd = new FormData(formRef.current)
      const newValue = ((fd.get('company_name') as string | null) ?? '').trim()
      setDisplayed(newValue)
      setEditing(false)
    }
  }, [state])

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {displayed ? (
          <span className="text-foreground">{displayed}</span>
        ) : (
          <span className="text-foreground/40 italic">Not set</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit company name"
          title="Edit company name"
          className="text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors p-1 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
            aria-hidden="true"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          name="company_name"
          maxLength={80}
          autoFocus
          defaultValue={displayed}
          placeholder="Acme Inc."
          className={`${inputClass} flex-1 min-w-0`}
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-brand-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shrink-0"
        >
          {pending && <Spinner />}
          {pending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors px-2 shrink-0 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {state?.fieldErrors?.company_name && (
        <p className="text-xs text-red-500">{state.fieldErrors.company_name}</p>
      )}
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
    </form>
  )
}
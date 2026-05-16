'use client'

import { useActionState, useState } from 'react'
import { updateEmail } from '@/lib/actions/account'
import Spinner from '@/components/ui/Spinner'

const inputClass = 'border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function EmailEditor({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false)
  const [state, formAction, pending] = useActionState(updateEmail, undefined)

  // Collapse the editor once Supabase confirms the change was queued; the success
  // message stays visible in the read view until the user navigates away. Track
  // the previous message so the collapse only fires on transition — React 19's
  // set-state-in-effect rule disallows the useEffect form of this.
  const [prevMessage, setPrevMessage] = useState<string | undefined>(undefined)
  if (state?.message !== prevMessage) {
    setPrevMessage(state?.message)
    if (state?.message) setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-foreground">{currentEmail}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit email"
            title="Edit email"
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
        {state?.message && (
          <p className="text-xs text-green-500">{state.message}</p>
        )}
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <p className="text-xs text-foreground/60">
        A confirmation link will be sent to both your current and new address — both must be clicked.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="email"
          name="email"
          required
          autoFocus
          defaultValue={currentEmail}
          placeholder="you@example.com"
          className={`${inputClass} flex-1 min-w-0`}
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-brand-foreground rounded-lg px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shrink-0"
        >
          {pending && <Spinner />}
          {pending ? 'Sending...' : 'Save'}
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
      {state?.fieldErrors?.email && (
        <p className="text-xs text-red-500">{state.fieldErrors.email}</p>
      )}
      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}
    </form>
  )
}
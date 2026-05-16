'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { updatePassword } from '@/lib/actions/account'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function PasswordEditor() {
  const [editing, setEditing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(updatePassword, undefined)

  // On success: wipe plaintext from the DOM and collapse back to the read view.
  useEffect(() => {
    if (state?.message && formRef.current) {
      formRef.current.reset()
      setEditing(false)
    }
  }, [state])

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-foreground tracking-widest">••••••••</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-brand hover:opacity-80 transition-opacity"
        >
          Change password
        </button>
        {state?.message && (
          <span className="text-xs text-green-500">{state.message}</span>
        )}
      </div>
    )
  }

  // Blocking paste / drop forces the user to retype the password into the confirm
  // field — proves they remember it instead of copying from the field above.
  const blockPaste = (e: React.ClipboardEvent | React.DragEvent) => e.preventDefault()

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current_password" className="text-xs font-medium text-foreground/70">Current password</label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
        {state?.fieldErrors?.current_password && (
          <p className="text-xs text-red-500">{state.fieldErrors.current_password}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="new_password" className="text-xs font-medium text-foreground/70">New password</label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
        {state?.fieldErrors?.new_password && (
          <p className="text-xs text-red-500">{state.fieldErrors.new_password}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm_password" className="text-xs font-medium text-foreground/70">Confirm new password</label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          onPaste={blockPaste}
          onDrop={blockPaste}
          className={inputClass}
        />
        {state?.fieldErrors?.confirm_password && (
          <p className="text-xs text-red-500">{state.fieldErrors.confirm_password}</p>
        )}
      </div>

      {state?.error && <p className="text-xs text-red-500">{state.error}</p>}

      <div className="flex items-center gap-2 mt-1">
        <SubmitButton pending={pending} label="Update password" pendingLabel="Updating..." />
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors px-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
'use client'

import { useActionState, useRef, useEffect } from 'react'
import { updatePassword } from '@/lib/actions/account'
import SubmitButton from '@/components/ui/SubmitButton'

const inputClass = 'border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, undefined)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form once a password change succeeds — leaving the plaintext password
  // sitting in the DOM is a footgun.
  useEffect(() => {
    if (state?.message && formRef.current) formRef.current.reset()
  }, [state?.message])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current_password" className="text-sm font-medium">Current password</label>
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
        <label htmlFor="new_password" className="text-sm font-medium">New password</label>
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
        <label htmlFor="confirm_password" className="text-sm font-medium">Confirm new password</label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
        {state?.fieldErrors?.confirm_password && (
          <p className="text-xs text-red-500">{state.fieldErrors.confirm_password}</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-500">{state.message}</p>}

      <div>
        <SubmitButton pending={pending} label="Update password" pendingLabel="Updating..." />
      </div>
    </form>
  )
}
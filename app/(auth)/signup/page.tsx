'use client'

import { useActionState } from 'react'
import { signup } from '@/lib/actions/auth'
import Link from 'next/link'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined)

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand mb-2">Create an account</h1>
        <p className="text-sm text-foreground/60 mb-8">Start tracking your A/B tests</p>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="border border-foreground/20 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          {state?.message && (
            <p className="text-sm text-green-500">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-foreground/60 text-center mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
'use client'

import { useActionState, Suspense } from 'react'
import { login } from '@/lib/actions/auth'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function UrlError() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  if (!urlError) return null
  return <p className="text-sm text-red-500">{urlError}</p>
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-brand mb-2">Welcome back</h1>
        <p className="text-sm text-foreground/60 mb-8">Sign in to your account</p>

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
          <Suspense fallback={null}>
            <UrlError />
          </Suspense>

          <button
            type="submit"
            disabled={pending}
            className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-foreground/60 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand hover:underline">Sign up</Link>
        </p>
      </div>
    </main>
  )
}
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
    <main className="relative flex flex-1 pt-14 items-center justify-center px-4 overflow-hidden bg-auth-gradient">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <div className="size-11 rounded-2xl bg-brand shadow-lg shadow-brand/30 mb-5 flex items-center justify-center ring-1 ring-foreground/10">
            <span className="text-brand-foreground font-bold tracking-tight text-sm">AB</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
          <p className="text-sm text-foreground/60 mt-1">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur-sm shadow-xl shadow-foreground/[0.04] ring-1 ring-foreground/5 p-6">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="border border-foreground/15 rounded-lg px-3 py-2 bg-background/60 text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="border border-foreground/15 rounded-lg px-3 py-2 bg-background/60 text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-brand focus:ring-2 focus:ring-brand/20"
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
              className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/30 hover:opacity-95 disabled:opacity-50 disabled:hover:shadow-md transition-all mt-1"
            >
              {pending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-sm text-foreground/60 text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </main>
  )
}
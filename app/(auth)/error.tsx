'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="w-full max-w-sm">
        <p className="font-semibold text-foreground">Something went wrong</p>
        <p className="text-sm text-foreground/50 mt-1 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link href="/login" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  )
}
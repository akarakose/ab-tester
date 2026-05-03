'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="font-semibold text-foreground">Something went wrong</p>
      <p className="text-sm text-foreground/50 mt-1 mb-6 max-w-sm">
        An unexpected error occurred. This is likely a temporary issue.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <Link
          href="/dashboard/experiments"
          className="text-sm text-foreground/50 hover:text-foreground transition-colors"
        >
          Go to experiments
        </Link>
      </div>
    </div>
  )
}
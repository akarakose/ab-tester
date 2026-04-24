'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ExperimentError({
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
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-red-200 dark:border-red-900 rounded-xl text-center">
        <p className="font-semibold text-foreground">Something went wrong</p>
        <p className="text-sm text-foreground/50 mt-1 mb-6">
          Failed to load this experiment. This is likely a temporary issue.
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
            Back to experiments
          </Link>
        </div>
      </div>
    </div>
  )
}
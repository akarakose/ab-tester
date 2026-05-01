import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Experiment',
}

export default function NewExperimentTypePage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="mb-8">
        <Link href="/dashboard/experiments" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
          ← Back to experiments
        </Link>
        <h1 className="text-xl font-bold mt-3">New experiment</h1>
        <p className="text-sm text-foreground/50 mt-1">How would you like to enter your data?</p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/experiments/new/csv"
          className="group flex items-start gap-4 border border-foreground/15 rounded-xl p-5 hover:border-brand/50 hover:bg-brand/5 transition-colors"
        >
          <div className="mt-0.5 w-9 h-9 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0 group-hover:bg-brand/10 transition-colors">
            <svg className="w-5 h-5 text-foreground/50 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-sm">Upload CSV</p>
            <p className="text-sm text-foreground/50 mt-0.5">Import experiment data from a spreadsheet or analytics export.</p>
          </div>
        </Link>

        <Link
          href="/dashboard/experiments/new/single"
          className="group flex items-start gap-4 border border-foreground/15 rounded-xl p-5 hover:border-brand/50 hover:bg-brand/5 transition-colors"
        >
          <div className="mt-0.5 w-9 h-9 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0 group-hover:bg-brand/10 transition-colors">
            <svg className="w-5 h-5 text-foreground/50 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-sm">Single comparison</p>
            <p className="text-sm text-foreground/50 mt-0.5">Manually enter visitors and conversions for each variant.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
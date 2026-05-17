import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overview' }

export default function OverviewPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold">Overview</h1>
      <p className="text-sm text-foreground/50 mt-2">Nothing here yet.</p>
    </div>
  )
}
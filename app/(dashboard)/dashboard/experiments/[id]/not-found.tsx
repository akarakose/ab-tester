import Link from 'next/link'

export default function ExperimentNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-foreground/20 rounded-xl text-center">
        <p className="font-semibold text-foreground">Experiment not found</p>
        <p className="text-sm text-foreground/50 mt-1 mb-6">
          This experiment doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard/experiments"
          className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Back to experiments
        </Link>
      </div>
    </div>
  )
}
import { getExperiments } from '@/lib/actions/experiments'
import Link from 'next/link'
import ExperimentCard from '@/components/experiments/ExperimentCard'

export default async function ExperimentsPage() {
  const experiments = await getExperiments()

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Experiments</h1>
        <Link
          href="/dashboard/experiments/new"
          className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New experiment
        </Link>
      </div>

      {experiments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-foreground/20 rounded-xl text-center px-6">
          <svg
            className="w-10 h-10 text-foreground/20 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V19a1 1 0 001 1h4a1 1 0 001-1v-5.5M3 13.5V9a1 1 0 011-1h4a1 1 0 011 1v4.5M3 13.5h6M10 19V7a1 1 0 011-1h4a1 1 0 011 1v12M10 19h6M17 19v-9a1 1 0 011-1h2a1 1 0 011 1v9M17 19h4" />
          </svg>
          <p className="font-semibold text-foreground">No experiments yet</p>
          <p className="text-sm text-foreground/50 mt-1 mb-6 max-w-xs">
            Create your first A/B test to start measuring what works.
          </p>
          <Link
            href="/dashboard/experiments/new"
            className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Create experiment
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {experiments.map(exp => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      )}
    </div>
  )
}
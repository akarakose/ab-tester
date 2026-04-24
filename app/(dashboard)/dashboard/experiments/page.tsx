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
        <div className="text-center py-20 border border-dashed border-foreground/20 rounded-xl">
          <p className="text-foreground/50 text-sm">No experiments yet.</p>
          <Link href="/dashboard/experiments/new" className="text-brand text-sm hover:underline mt-2 inline-block">
            Create your first experiment →
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
import type { Metadata } from 'next'
import { getExperiment } from '@/lib/actions/experiments'
import { calculateResults } from '@/lib/stats'
import { fmtPct, fmtNum } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditForm from './EditForm'
import DeleteButton from './DeleteButton'
import StatusBadge from '@/components/ui/StatusBadge'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const experiment = await getExperiment(id)
  return { title: experiment?.name ?? 'Experiment' }
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-foreground/5 last:border-0">
      <span className="text-sm text-foreground/50">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const experiment = await getExperiment(id)
  if (!experiment) notFound()

  const results = calculateResults(
    experiment.control_visitors,
    experiment.control_conversions,
    experiment.variant_visitors,
    experiment.variant_conversions,
    experiment.confidence_level
  )

  const uplift = results.control_rate === 0
    ? 0
    : ((results.variant_rate - results.control_rate) / results.control_rate) * 100

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/dashboard/experiments" className="text-sm text-foreground/50 hover:text-foreground transition-colors">
            ← Back to experiments
          </Link>
          <h1 className="text-xl font-bold mt-2">{experiment.name}</h1>
          <p className="text-sm text-foreground/40 mt-0.5">
            Created {new Date(experiment.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={experiment.status} />
          <DeleteButton id={experiment.id} />
        </div>
      </div>

      <div className="border border-foreground/10 rounded-xl p-5 mb-8">
        <h2 className="font-semibold mb-4">Results</h2>

        <div className={`rounded-lg p-4 mb-5 ${results.is_significant ? 'bg-green-50 dark:bg-green-900/20' : 'bg-foreground/5'}`}>
          <p className={`font-semibold ${results.is_significant ? 'text-green-700 dark:text-green-400' : 'text-foreground/60'}`}>
            {results.is_significant ? 'Statistically significant' : 'Not significant yet'}
          </p>
          <p className="text-sm text-foreground/50 mt-0.5">
            {results.is_significant
              ? `The variant is the winner at ${(experiment.confidence_level * 100).toFixed(0)}% confidence.`
              : `More data needed to reach ${(experiment.confidence_level * 100).toFixed(0)}% confidence.`}
          </p>
        </div>

        <StatRow label="Control conversion rate" value={fmtPct(results.control_rate)} />
        <StatRow label="Variant conversion rate" value={fmtPct(results.variant_rate)} />
        <StatRow
          label="Uplift"
          value={Number.isFinite(uplift) ? `${uplift >= 0 ? '+' : ''}${uplift.toFixed(2)}%` : '—'}
        />
        <StatRow label="Z-score" value={fmtNum(results.z_score)} />
        <StatRow label="P-value" value={fmtNum(results.p_value, 4)} />
        <StatRow label="Confidence level" value={`${(experiment.confidence_level * 100).toFixed(0)}%`} />
      </div>

      <div className="border border-foreground/10 rounded-xl p-5">
        <h2 className="font-semibold mb-5">Edit experiment</h2>
        <EditForm experiment={experiment} />
      </div>
    </div>
  )
}
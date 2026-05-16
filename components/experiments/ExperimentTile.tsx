import Link from 'next/link'
import type { BinomialMetricResult, ContinuousMetricResult, Experiment } from '@/types/experiment'
import { calculateResults, calculateMultipleMeasuresResults } from '@/lib/stats'
import { calculateContinuousResults } from '@/lib/logic/welch'
import StatusBadge from '@/components/ui/StatusBadge'

function getOutcome(experiment: Experiment): { hasWinner: boolean; label: string } {
  const props = experiment.properties
  if (props.experiment_type === 'continuous_single') {
    const r = calculateContinuousResults(props, experiment.confidence_level)
    const hasWinner = r.challengers.some(c => c.is_significant)
    return { hasWinner, label: hasWinner ? 'Has a winner' : 'Not significant yet' }
  }
  if (props.experiment_type === 'binomial_single') {
    const r = calculateResults(props, experiment.confidence_level)
    const hasWinner = r.challengers.some(c => c.is_significant)
    return { hasWinner, label: hasWinner ? 'Has a winner' : 'Not significant yet' }
  }
  const measureResults = calculateMultipleMeasuresResults(props, experiment.confidence_level)
  const testable = measureResults.filter(
    (r): r is BinomialMetricResult | ContinuousMetricResult => r.type !== 'no_test' && r.tested
  )
  const hasWinner = testable.some(r => r.challengers.some(c => c.is_significant))
  return {
    hasWinner,
    label: testable.length === 0
      ? 'No tests applied'
      : hasWinner
        ? 'Has a winner'
        : 'Not significant yet',
  }
}

export default function ExperimentTile({ experiment }: { experiment: Experiment }) {
  const { hasWinner, label } = getOutcome(experiment)
  const variantCount = experiment.properties.variant_names.length
  const metricCount = experiment.properties.metric_names.length
  const confidencePct = (experiment.confidence_level * 100).toFixed(0)

  return (
    <Link
      href={`/dashboard/experiments/${experiment.id}`}
      className="block border border-foreground/10 rounded-xl p-4 hover:border-brand/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h2 className="font-semibold text-sm truncate flex-1">{experiment.name}</h2>
        <StatusBadge status={experiment.status} />
      </div>
      <p className="text-xs text-foreground/50">
        Created {new Date(experiment.created_at).toLocaleDateString()}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasWinner ? 'bg-green-500' : 'bg-foreground/20'}`} />
        <p className="text-xs text-foreground/70 truncate">{label}</p>
      </div>
      <p className="text-xs text-foreground/40 mt-1">
        {variantCount} variants · {metricCount} metric{metricCount === 1 ? '' : 's'} · {confidencePct}% confidence
      </p>
    </Link>
  )
}
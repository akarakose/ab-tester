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

export default function ExperimentListRow({ experiment }: { experiment: Experiment }) {
  const { hasWinner, label } = getOutcome(experiment)
  const variantCount = experiment.properties.variant_names.length
  const metricCount = experiment.properties.metric_names.length
  const updated = new Date(experiment.updated_at).toLocaleDateString()

  return (
    <Link
      href={`/dashboard/experiments/${experiment.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.025] transition-colors"
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasWinner ? 'bg-green-500' : 'bg-foreground/20'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm truncate">{experiment.name}</h2>
          <StatusBadge status={experiment.status} />
        </div>
        <p className="text-xs text-foreground/50 mt-0.5 truncate">
          {label} · {variantCount} variants · {metricCount} metric{metricCount === 1 ? '' : 's'} · Updated {updated}
        </p>
      </div>
      <svg className="w-4 h-4 text-foreground/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
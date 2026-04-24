import { calculateResults } from '@/lib/stats'
import { fmtPct } from '@/lib/format'
import Link from 'next/link'
import type { Experiment } from '@/types/experiment'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ExperimentCard({ experiment }: { experiment: Experiment }) {
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
    <Link
      href={`/dashboard/experiments/${experiment.id}`}
      className="block border border-foreground/10 rounded-xl p-5 hover:border-brand/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{experiment.name}</h2>
          <p className="text-sm text-foreground/50 mt-0.5">
            {new Date(experiment.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={experiment.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-foreground/50 text-xs">Control</p>
          <p className="font-medium">{fmtPct(results.control_rate)}</p>
        </div>
        <div>
          <p className="text-foreground/50 text-xs">Variant</p>
          <p className="font-medium">{fmtPct(results.variant_rate)}</p>
        </div>
        <div>
          <p className="text-foreground/50 text-xs">Uplift</p>
          <p className={`font-medium ${uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {Number.isFinite(uplift) ? `${uplift >= 0 ? '+' : ''}${uplift.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${results.is_significant ? 'bg-green-500' : 'bg-foreground/20'}`} />
        <p className="text-xs text-foreground/50">
          {results.is_significant ? 'Statistically significant' : 'Not significant yet'}
          {' · '}{(experiment.confidence_level * 100).toFixed(0)}% confidence level
        </p>
      </div>
    </Link>
  )
}
import { calculateResults } from '@/lib/stats'
import { fmtPct } from '@/lib/format'
import Link from 'next/link'
import type { Experiment } from '@/types/experiment'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const results = calculateResults(experiment.variants, experiment.confidence_level)
  const hasWinner = results.challengers.some(c => c.is_significant)

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

      <div className="mt-4 text-sm">
        <div className="grid grid-cols-4 gap-2 text-xs text-foreground/50 mb-1.5 px-1">
          <span>Variant</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Uplift</span>
          <span className="text-right">Sig.</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-4 gap-2 px-1 py-1 rounded-lg bg-foreground/5">
            <span className="text-xs font-medium truncate">{results.control.name}</span>
            <span className="text-xs text-right">{fmtPct(results.control.conversion_rate)}</span>
            <span className="text-xs text-right text-foreground/40">—</span>
            <span className="text-xs text-right text-foreground/40">—</span>
          </div>

          {results.challengers.map(c => (
            <div key={c.name} className="grid grid-cols-4 gap-2 px-1 py-1 rounded-lg hover:bg-foreground/5">
              <span className="text-xs font-medium truncate">{c.name}</span>
              <span className="text-xs text-right">{fmtPct(c.conversion_rate)}</span>
              <span className={`text-xs text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(1)}%` : '—'}
              </span>
              <span className="text-xs text-right">
                {c.is_significant ? '✓' : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasWinner ? 'bg-green-500' : 'bg-foreground/20'}`} />
        <p className="text-xs text-foreground/50">
          {hasWinner ? 'Has a winner' : 'Not significant yet'}
          {' · '}{(experiment.confidence_level * 100).toFixed(0)}% confidence level
        </p>
      </div>
    </Link>
  )
}
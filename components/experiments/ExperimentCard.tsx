import { Fragment } from 'react'
import { calculateResults, calculateMultipleMeasuresResults } from '@/lib/stats'
import { calculateContinuousResults } from '@/lib/logic/welch'
import { fmtPct, fmtNum, fmtValue } from '@/lib/format'
import Link from 'next/link'
import type { BinomialMetricResult, ContinuousMetricResult, Experiment } from '@/types/experiment'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const props = experiment.properties

  if (props.experiment_type === 'continuous_single') {
    const continuousResults = calculateContinuousResults(props, experiment.confidence_level)
    const hasWinner = continuousResults.challengers.some(c => c.is_significant)
    const metricName = props.metric_names[0] ?? 'Metric'

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
          <p className="text-xs text-foreground/50 mb-1.5 truncate">Metric: <span className="text-foreground/70">{metricName}</span></p>
          <div className="grid grid-cols-4 gap-2 text-xs text-foreground/50 mb-1.5 px-1">
            <span>Variant</span>
            <span className="text-right">Mean</span>
            <span className="text-right">Uplift</span>
            <span className="text-right">Sig.</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-4 gap-2 px-1 py-1 rounded-lg bg-foreground/5">
              <span className="text-xs font-medium truncate">{continuousResults.control.name}</span>
              <span className="text-xs text-right">{fmtNum(continuousResults.control.mean, 2)}</span>
              <span className="text-xs text-right text-foreground/40">—</span>
              <span className="text-xs text-right text-foreground/40">—</span>
            </div>

            {continuousResults.challengers.map(c => (
              <div key={c.name} className="grid grid-cols-4 gap-2 px-1 py-1 rounded-lg hover:bg-foreground/5">
                <span className="text-xs font-medium truncate">{c.name}</span>
                <span className="text-xs text-right">{fmtNum(c.mean, 2)}</span>
                <span className={`text-xs text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(1)}%` : '—'}
                </span>
                <span className={`text-xs text-right ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600' : 'text-red-500') : 'text-foreground/40'}`}>
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

  if (props.experiment_type === 'multiple_measures') {
    const measureResults = calculateMultipleMeasuresResults(props, experiment.confidence_level)
    const variantNames = props.variant_names
    const challengerNames = variantNames.slice(1)
    const testableResults = measureResults.filter(
      (r): r is BinomialMetricResult | ContinuousMetricResult => r.type !== 'no_test'
    )
    const significantPerVariant = challengerNames.map((name, i) => ({
      name,
      count: testableResults.filter(r => r.challengers[i]?.is_significant).length,
    }))
    const anySignificant = significantPerVariant.some(v => v.count > 0)
    const displayedResults = measureResults.slice(0, 5)
    const hiddenCount = measureResults.length - displayedResults.length

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

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-foreground/8">
                <th className="text-left pb-1.5 text-foreground/50 font-medium pr-4">Metric</th>
                <th className="text-right pb-1.5 text-foreground/50 font-medium px-2 whitespace-nowrap">
                  {variantNames[0]}
                </th>
                <th className="pb-1.5 w-3" />
                {challengerNames.map(v => (
                  <Fragment key={v}>
                    <th className="text-right pb-1.5 text-foreground/50 font-medium px-2 whitespace-nowrap">{v}</th>
                    <th className="pb-1.5 w-3" />
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedResults.map((r, i) => (
                <tr key={r.metricName} className="border-b border-foreground/5 last:border-0">
                  <td className="py-1 pr-4 font-medium truncate max-w-[110px]">{r.metricName}</td>
                  <td className="py-1 px-2 text-right text-foreground/60">
                    {r.type === 'continuous'
                      ? fmtValue(r.control.mean, props.metric_formats?.[i])
                      : r.type === 'no_test'
                        ? fmtValue(r.control.value, props.metric_formats?.[i])
                        : fmtPct(r.control.rate)}
                  </td>
                  <td className="py-1 px-1 text-foreground/20">—</td>
                  {r.type === 'continuous' && r.challengers.map(c => (
                    <Fragment key={c.name}>
                      <td className="py-1 px-2 text-right text-foreground/60">{fmtValue(c.mean, props.metric_formats?.[i])}</td>
                      <td className={`py-1 px-1 ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600' : 'text-red-500') : 'text-foreground/20'}`}>
                        {c.is_significant ? '✓' : '—'}
                      </td>
                    </Fragment>
                  ))}
                  {r.type === 'binomial' && r.challengers.map(c => (
                    <Fragment key={c.name}>
                      <td className="py-1 px-2 text-right text-foreground/60">{fmtPct(c.conversion_rate)}</td>
                      <td className={`py-1 px-1 ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600' : 'text-red-500') : 'text-foreground/20'}`}>
                        {c.is_significant ? '✓' : '—'}
                      </td>
                    </Fragment>
                  ))}
                  {r.type === 'no_test' && r.challengers.map(c => (
                    <Fragment key={c.name}>
                      <td className="py-1 px-2 text-right text-foreground/60">{fmtValue(c.value, props.metric_formats?.[i])}</td>
                      <td className="py-1 px-1 text-foreground/20" title="No test">—</td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {hiddenCount > 0 && (
            <p className="text-xs text-foreground/40 mt-2">+{hiddenCount} more metric{hiddenCount !== 1 ? 's' : ''}</p>
          )}
        </div>

        <div className="mt-3 flex items-start gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${anySignificant ? 'bg-green-500' : 'bg-foreground/20'}`} />
          <div className="text-xs text-foreground/50">
            {challengerNames.length === 1 ? (
              <p>
                {testableResults.length === 0
                  ? 'No tests applied'
                  : significantPerVariant[0].count > 0
                    ? `${significantPerVariant[0].count} of ${testableResults.length} metrics significant`
                    : 'No significant metrics yet'}
                {' · '}{measureResults.length} metrics · {variantNames.length} variants
              </p>
            ) : (
              <>
                {testableResults.length === 0 ? (
                  <p>No tests applied</p>
                ) : (
                  significantPerVariant.map(v => (
                    <p key={v.name}>
                      {v.count > 0
                        ? `${v.count} of ${testableResults.length} metrics significant in ${v.name}`
                        : `No significant metrics in ${v.name}`}
                    </p>
                  ))
                )}
                <p>{measureResults.length} metrics · {variantNames.length} variants</p>
              </>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // binomial_single
  const results = calculateResults(props, experiment.confidence_level)
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
              <span className={`text-xs text-right ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600' : 'text-red-500') : 'text-foreground/40'}`}>
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
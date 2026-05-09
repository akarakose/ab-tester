import { Fragment } from 'react'
import type { Metadata } from 'next'
import type { BinomialMetricResult, ContinuousMetricResult } from '@/types/experiment'
import { getExperiment } from '@/lib/actions/experiments'
import { calculateResults, calculateMultipleMeasuresResults } from '@/lib/stats'
import { calculateContinuousResults } from '@/lib/logic/welch'
import { fmtPct, fmtNum, fmtValue } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditForm from './EditForm'
import CsvEditForm from './CsvEditForm'
import ContinuousResultsTable from './ContinuousResultsTable'
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

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const experiment = await getExperiment(id)
  if (!experiment) notFound()

  const confidencePct = (experiment.confidence_level * 100).toFixed(0)
  const props = experiment.properties

  if (props.experiment_type === 'continuous_single') {
    const continuousResults = calculateContinuousResults(props, experiment.confidence_level)
    const winners = continuousResults.challengers.filter(c => c.is_significant)
    const hasWinner = winners.length > 0
    const metricName = props.metric_names[0] ?? 'Metric'

    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
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

          <div className={`rounded-lg p-4 mb-5 ${hasWinner ? 'bg-green-50 dark:bg-green-900/20' : 'bg-foreground/5'}`}>
            <p className={`font-semibold ${hasWinner ? 'text-green-700 dark:text-green-400' : 'text-foreground/60'}`}>
              {hasWinner
                ? `${winners.length === 1 ? 'Winner found' : `${winners.length} winners found`}`
                : 'Not significant yet'}
            </p>
            <p className="text-sm text-foreground/50 mt-0.5">
              {hasWinner
                ? `${winners.map(w => w.name).join(', ')} ${winners.length === 1 ? 'is' : 'are'} statistically significant at ${confidencePct}% confidence.`
                : `More data needed to reach ${confidencePct}% confidence.`}
            </p>
          </div>

          <ContinuousResultsTable results={continuousResults} metricName={metricName} />

          <p className="text-xs text-foreground/40 mt-4">Confidence level: {confidencePct}%</p>
        </div>

        <div className="border border-foreground/10 rounded-xl p-5">
          <h2 className="font-semibold mb-5">Edit experiment</h2>
          <EditForm experiment={experiment} />
        </div>
      </div>
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

    const visitorGroups: { visitors: number[]; metricNames: string[]; label: string }[] = []
    for (let m = 0; m < props.metric_names.length; m++) {
      if (props.metric_types[m] === 'no_test') continue
      const visitors = variantNames.map((_, i) => props.N[i]?.[m] ?? 0)
      const label = props.visitor_group_labels[m] ?? ''
      const existing = visitorGroups.find(g => g.label === label && g.visitors.length === visitors.length && g.visitors.every((v, i) => v === visitors[i]))
      if (existing) existing.metricNames.push(props.metric_names[m])
      else visitorGroups.push({ visitors, metricNames: [props.metric_names[m]], label })
    }

    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
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

          <div className={`rounded-lg p-4 mb-5 ${anySignificant ? 'bg-green-50 dark:bg-green-900/20' : 'bg-foreground/5'}`}>
            {testableResults.length === 0 ? (
              <>
                <p className="font-semibold text-foreground/60">No statistical tests applied</p>
                <p className="text-sm text-foreground/50 mt-0.5">All metrics are marked as &quot;no test&quot;.</p>
              </>
            ) : anySignificant ? (
              <>
                {challengerNames.length === 1 ? (
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    {significantPerVariant[0].count} of {testableResults.length} metrics significant
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {significantPerVariant.map(v => (
                      <p key={v.name} className={`font-semibold ${v.count > 0 ? 'text-green-700 dark:text-green-400' : 'text-foreground/60'}`}>
                        {v.count > 0
                          ? `${v.count} of ${testableResults.length} metrics significant in ${v.name}`
                          : `No significant metrics in ${v.name}`}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-sm text-foreground/50 mt-1">At {confidencePct}% confidence</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground/60">No significant metrics yet</p>
                <p className="text-sm text-foreground/50 mt-0.5">More data needed to reach {confidencePct}% confidence.</p>
              </>
            )}
          </div>

          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-foreground/5 [&::-webkit-scrollbar-thumb]:bg-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-2 pr-6 text-foreground/50 font-medium text-xs whitespace-nowrap">Metric</th>
                  <th className="text-right py-2 px-3 text-foreground/50 font-medium text-xs whitespace-nowrap">
                    {variantNames[0]} (control)
                  </th>
                  {challengerNames.map(v => (
                    <th key={v} colSpan={3} className="text-left py-2 px-3 text-foreground/50 font-medium text-xs whitespace-nowrap">
                      {v}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-foreground/10">
                  <th />
                  <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">Value</th>
                  {challengerNames.map(v => (
                    <Fragment key={v}>
                      <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">Value</th>
                      <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">Uplift</th>
                      <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">P-value</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {measureResults.map((r, i) => {
                  const typeLabel =
                    r.type === 'continuous' ? 'cont.' :
                    r.type === 'no_test' ? 'no test' : 'binom.'
                  const typeColor =
                    r.type === 'continuous' ? 'text-purple-500/70' :
                    r.type === 'no_test' ? 'text-amber-600/80 dark:text-amber-500/80' : 'text-foreground/40'
                  return (
                    <tr key={r.metricName} className={`border-b border-foreground/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-foreground/[0.015]'}`}>
                      <td className="py-2.5 pr-6 font-medium whitespace-nowrap">
                        {r.metricName}
                        <span className={`ml-1.5 text-[10px] uppercase tracking-wide font-normal ${typeColor}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.type === 'continuous'
                          ? fmtValue(r.control.mean, props.metric_formats?.[i])
                          : r.type === 'no_test'
                            ? fmtValue(r.control.value, props.metric_formats?.[i])
                            : fmtPct(r.control.rate)}
                      </td>
                      {r.type === 'continuous' && r.challengers.map(c => (
                        <Fragment key={c.name}>
                          <td className="py-2.5 px-3 text-right">{fmtValue(c.mean, props.metric_formats?.[i])}</td>
                          <td className={`py-2.5 px-3 text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(2)}%` : '—'}
                          </td>
                          <td className={`py-2.5 px-3 text-right ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium') : ''}`}>
                            {fmtNum(c.p_value, 4)}
                            {c.is_significant && <span className="ml-1.5 text-xs">✓</span>}
                          </td>
                        </Fragment>
                      ))}
                      {r.type === 'binomial' && r.challengers.map(c => (
                        <Fragment key={c.name}>
                          <td className="py-2.5 px-3 text-right">{fmtPct(c.conversion_rate)}</td>
                          <td className={`py-2.5 px-3 text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(2)}%` : '—'}
                          </td>
                          <td className={`py-2.5 px-3 text-right ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium') : ''}`}>
                            {fmtNum(c.p_value, 4)}
                            {c.is_significant && <span className="ml-1.5 text-xs">✓</span>}
                          </td>
                        </Fragment>
                      ))}
                      {r.type === 'no_test' && r.challengers.map(c => (
                        <Fragment key={c.name}>
                          <td className="py-2.5 px-3 text-right">{fmtValue(c.value, props.metric_formats?.[i])}</td>
                          <td className={`py-2.5 px-3 text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(2)}%` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-foreground/30" title="No statistical test applied">—</td>
                        </Fragment>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {challengerNames.length > 1 && (
            <p className="text-xs text-foreground/30 mt-2 text-right">scroll to see all variants →</p>
          )}

          <div className="text-xs text-foreground/40 mt-4 flex flex-col gap-0.5">
            <p>Confidence level: {confidencePct}%</p>
            {visitorGroups.length === 1 ? (
              <p>
                {visitorGroups[0].label && <span className="text-foreground/60">{visitorGroups[0].label}: </span>}
                Visitors per variant: {variantNames.map((name, i) => `${name} ${visitorGroups[0].visitors[i].toLocaleString()}`).join(', ')}
              </p>
            ) : (
              visitorGroups.map((g, gi) => (
                <p key={gi}>
                  <span className="text-foreground/60">{g.label || g.metricNames.join(', ')}:</span>{' '}
                  {variantNames.map((name, vi) => `${name} ${g.visitors[vi].toLocaleString()}`).join(', ')}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="border border-foreground/10 rounded-xl p-5">
          <h2 className="font-semibold mb-5">Edit experiment</h2>
          <CsvEditForm experiment={experiment} />
        </div>
      </div>
    )
  }

  // binomial_single
  const results = calculateResults(props, experiment.confidence_level)
  const winners = results.challengers.filter(c => c.is_significant)
  const hasWinner = winners.length > 0
  const visitors = (i: number) => props.N[i]?.[0] ?? 0
  const conversions = (i: number) => Math.round((props.metric_values[i]?.[0] ?? 0) * visitors(i))

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

        <div className={`rounded-lg p-4 mb-5 ${hasWinner ? 'bg-green-50 dark:bg-green-900/20' : 'bg-foreground/5'}`}>
          <p className={`font-semibold ${hasWinner ? 'text-green-700 dark:text-green-400' : 'text-foreground/60'}`}>
            {hasWinner
              ? `${winners.length === 1 ? 'Winner found' : `${winners.length} winners found`}`
              : 'Not significant yet'}
          </p>
          <p className="text-sm text-foreground/50 mt-0.5">
            {hasWinner
              ? `${winners.map(w => w.name).join(', ')} ${winners.length === 1 ? 'is' : 'are'} statistically significant at ${confidencePct}% confidence.`
              : `More data needed to reach ${confidencePct}% confidence.`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10">
                <th className="text-left py-2 pr-4 text-foreground/50 font-medium text-xs">Variant</th>
                <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">Visitors</th>
                <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">Conversions</th>
                <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">Rate</th>
                <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">Uplift</th>
                <th className="text-right py-2 pl-4 text-foreground/50 font-medium text-xs">P-value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-foreground/5 bg-foreground/[0.02]">
                <td className="py-2.5 pr-4 font-medium">{results.control.name}</td>
                <td className="py-2.5 px-4 text-right">{visitors(0).toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right">{conversions(0).toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right font-medium">{fmtPct(results.control.conversion_rate)}</td>
                <td className="py-2.5 px-4 text-right text-foreground/40">—</td>
                <td className="py-2.5 pl-4 text-right text-foreground/40">—</td>
              </tr>
              {results.challengers.map((c, i) => (
                <tr key={c.name} className={`border-b border-foreground/5 last:border-0 ${c.is_significant ? (c.uplift >= 0 ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10') : ''}`}>
                  <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                    {c.name}
                    {c.is_significant && <span className={`text-xs font-normal ${c.uplift >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{c.uplift >= 0 ? 'winner' : 'loser'}</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">{visitors(i + 1).toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right">{conversions(i + 1).toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtPct(c.conversion_rate)}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-right">{fmtNum(c.p_value, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-foreground/40 mt-4">
          Confidence level: {confidencePct}% · Z-scores available per variant in edit view
        </p>
      </div>

      <div className="border border-foreground/10 rounded-xl p-5">
        <h2 className="font-semibold mb-5">Edit experiment</h2>
        <EditForm experiment={experiment} />
      </div>
    </div>
  )
}
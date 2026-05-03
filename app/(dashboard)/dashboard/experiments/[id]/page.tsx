import { Fragment } from 'react'
import type { Metadata } from 'next'
import { getExperiment } from '@/lib/actions/experiments'
import { calculateResults, calculateCsvMetricResults } from '@/lib/stats'
import { fmtPct, fmtNum } from '@/lib/format'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditForm from './EditForm'
import CsvEditForm from './CsvEditForm'
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
  const isCsv = experiment.metrics && experiment.metrics.length > 0

  if (isCsv) {
    const csvResults = calculateCsvMetricResults(experiment.variants, experiment.metrics!, experiment.confidence_level)
    const challengers = experiment.variants.slice(1)
    const significantPerVariant = challengers.map((v, i) => ({
      name: v.name,
      count: csvResults.filter(r => r.challengers[i]?.is_significant).length,
    }))
    const anySignificant = significantPerVariant.some(v => v.count > 0)

    const variantVisitorsFallback = experiment.variants.map(v => v.visitors)
    const visitorGroups: { visitors: number[]; metricNames: string[]; label: string }[] = []
    for (const m of experiment.metrics!) {
      const visitors = m.visitors && m.visitors.length === variantVisitorsFallback.length ? m.visitors : variantVisitorsFallback
      const existing = visitorGroups.find(g => g.visitors.length === visitors.length && g.visitors.every((v, i) => v === visitors[i]))
      if (existing) existing.metricNames.push(m.name)
      else visitorGroups.push({ visitors: [...visitors], metricNames: [m.name], label: m.visitorGroupLabel ?? '' })
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
            {anySignificant ? (
              <>
                {challengers.length === 1 ? (
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    {significantPerVariant[0].count} of {csvResults.length} metrics significant
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {significantPerVariant.map(v => (
                      <p key={v.name} className={`font-semibold ${v.count > 0 ? 'text-green-700 dark:text-green-400' : 'text-foreground/60'}`}>
                        {v.count > 0
                          ? `${v.count} of ${csvResults.length} metrics significant in ${v.name}`
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
                    {experiment.variants[0].name} (control)
                  </th>
                  {challengers.map(v => (
                    <th key={v.name} colSpan={3} className="text-left py-2 px-3 text-foreground/50 font-medium text-xs whitespace-nowrap">
                      {v.name}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-foreground/10">
                  <th />
                  <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">Rate</th>
                  {challengers.map(v => (
                    <Fragment key={v.name}>
                      <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">Rate</th>
                      <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">Uplift</th>
                      <th className="text-right py-1.5 px-3 text-foreground/40 font-medium text-xs">P-value</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvResults.map((r, i) => (
                  <tr key={r.metricName} className={`border-b border-foreground/5 last:border-0 ${i % 2 === 0 ? '' : 'bg-foreground/[0.015]'}`}>
                    <td className="py-2.5 pr-6 font-medium whitespace-nowrap">{r.metricName}</td>
                    <td className="py-2.5 px-3 text-right">{fmtPct(r.control.rate)}</td>
                    {r.challengers.map(c => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {challengers.length > 1 && (
            <p className="text-xs text-foreground/30 mt-2 text-right">scroll to see all variants →</p>
          )}

          <div className="text-xs text-foreground/40 mt-4 flex flex-col gap-0.5">
            <p>Confidence level: {confidencePct}%</p>
            {visitorGroups.length === 1 ? (
              <p>
                {visitorGroups[0].label && <span className="text-foreground/60">{visitorGroups[0].label}: </span>}
                Visitors per variant: {experiment.variants.map((v, i) => `${v.name} ${visitorGroups[0].visitors[i].toLocaleString()}`).join(', ')}
              </p>
            ) : (
              visitorGroups.map((g, gi) => (
                <p key={gi}>
                  <span className="text-foreground/60">{g.label || g.metricNames.join(', ')}:</span>{' '}
                  {experiment.variants.map((v, vi) => `${v.name} ${g.visitors[vi].toLocaleString()}`).join(', ')}
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

  const results = calculateResults(experiment.variants, experiment.confidence_level)
  const winners = results.challengers.filter(c => c.is_significant)
  const hasWinner = winners.length > 0

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
                <td className="py-2.5 px-4 text-right">{experiment.variants[0].visitors.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right">{experiment.variants[0].conversions.toLocaleString()}</td>
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
                  <td className="py-2.5 px-4 text-right">{experiment.variants[i + 1].visitors.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right">{experiment.variants[i + 1].conversions.toLocaleString()}</td>
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
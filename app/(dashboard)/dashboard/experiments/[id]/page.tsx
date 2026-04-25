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

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const experiment = await getExperiment(id)
  if (!experiment) notFound()

  const results = calculateResults(experiment.variants, experiment.confidence_level)
  const winners = results.challengers.filter(c => c.is_significant)
  const hasWinner = winners.length > 0
  const confidencePct = (experiment.confidence_level * 100).toFixed(0)

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
                <tr key={c.name} className={`border-b border-foreground/5 last:border-0 ${c.is_significant ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                  <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                    {c.name}
                    {c.is_significant && <span className="text-xs text-green-600 dark:text-green-400 font-normal">winner</span>}
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
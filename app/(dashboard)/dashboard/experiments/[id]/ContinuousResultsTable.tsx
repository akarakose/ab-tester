import type { ContinuousExperimentResult } from '@/types/experiment'
import { fmtNum } from '@/lib/format'
import { cohensDLabel } from '@/lib/logic/welch'

export default function ContinuousResultsTable({
  results,
  metricName,
}: {
  results: ContinuousExperimentResult
  metricName: string
}) {
  const { control, challengers } = results
  const estimatedNames = [
    ...(control.std_dev_estimated ? [control.name] : []),
    ...challengers.filter(c => c.std_dev_estimated).map(c => c.name),
  ]

  return (
    <div>
      <p className="text-sm text-foreground/60 mb-3">
        Metric: <span className="font-medium text-foreground">{metricName}</span>
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10">
              <th className="text-left py-2 pr-4 text-foreground/50 font-medium text-xs">Variant</th>
              <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">N</th>
              <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">Mean</th>
              <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">95% CI</th>
              <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">Uplift</th>
              <th className="text-right py-2 px-4 text-foreground/50 font-medium text-xs">P-value</th>
              <th className="text-right py-2 pl-4 text-foreground/50 font-medium text-xs">Effect</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-foreground/5 bg-foreground/[0.02]">
              <td className="py-2.5 pr-4 font-medium">{control.name}</td>
              <td className="py-2.5 px-4 text-right">{control.sample_size.toLocaleString()}</td>
              <td className="py-2.5 px-4 text-right font-medium">{fmtNum(control.mean, 4)}</td>
              <td className="py-2.5 px-4 text-right text-foreground/40">—</td>
              <td className="py-2.5 px-4 text-right text-foreground/40">—</td>
              <td className="py-2.5 px-4 text-right text-foreground/40">—</td>
              <td className="py-2.5 pl-4 text-right text-foreground/40">—</td>
            </tr>
            {challengers.map(c => {
              const label = cohensDLabel(c.cohens_d)
              return (
                <tr
                  key={c.name}
                  className={`border-b border-foreground/5 last:border-0 ${
                    c.is_significant ? (c.uplift >= 0 ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10') : ''
                  }`}
                >
                  <td className="py-2.5 pr-4 font-medium flex items-center gap-2">
                    {c.name}
                    {c.is_significant && (
                      <span className={`text-xs font-normal ${c.uplift >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {c.uplift >= 0 ? 'winner' : 'loser'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">{c.sample_size.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{fmtNum(c.mean, 4)}</td>
                  <td className="py-2.5 px-4 text-right text-foreground/70 whitespace-nowrap">
                    [{fmtNum(c.ci_lo, 2)}, {fmtNum(c.ci_hi, 2)}]
                  </td>
                  <td className={`py-2.5 px-4 text-right font-medium ${c.uplift >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {Number.isFinite(c.uplift) ? `${c.uplift >= 0 ? '+' : ''}${c.uplift.toFixed(2)}%` : '—'}
                  </td>
                  <td className={`py-2.5 px-4 text-right ${c.is_significant ? (c.uplift >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium') : ''}`}>
                    {fmtNum(c.p_value, 4)}
                    {c.is_significant && <span className="ml-1.5 text-xs">✓</span>}
                  </td>
                  <td className="py-2.5 pl-4 text-right whitespace-nowrap">
                    d = {fmtNum(c.cohens_d, 2)}
                    {label && <span className="ml-1.5 text-xs text-foreground/50">{label}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-foreground/40 mt-4">
        Welch&apos;s t-test
        {estimatedNames.length > 0 && (
          <span className="text-amber-600 dark:text-amber-500"> · ⚠ Std dev estimated via Poisson for: {estimatedNames.join(', ')}</span>
        )}
      </p>
    </div>
  )
}
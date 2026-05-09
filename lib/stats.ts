import type {
  ExperimentResult,
  MetricResult,
  Properties,
  VariantResult,
} from '@/types/experiment'
import { buildContinuousSample, welchTest } from '@/lib/logic/welch'

// Abramowitz & Stegun approximation (max error: 1.5e-7)
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  const poly =
    t * (0.254829592 +
    t * (-0.284496736 +
    t * (1.421413741 +
    t * (-1.453152027 +
    t * 1.061405429))))
  return sign * (1 - poly * Math.exp(-x * x))
}

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)))
}

type BinomialSample = { name: string; visitors: number; conversions: number }

function zTest(control: BinomialSample, challenger: BinomialSample, alpha: number): VariantResult {
  const controlRate = control.visitors > 0 ? control.conversions / control.visitors : 0
  const challengerRate = challenger.visitors > 0 ? challenger.conversions / challenger.visitors : 0

  const pPool = (control.conversions + challenger.conversions) / (control.visitors + challenger.visitors)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / control.visitors + 1 / challenger.visitors))

  const zScore = se === 0 ? 0 : (challengerRate - controlRate) / se
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))
  const uplift = controlRate === 0 ? 0 : ((challengerRate - controlRate) / controlRate) * 100

  return {
    name: challenger.name,
    conversion_rate: challengerRate,
    z_score: zScore,
    p_value: pValue,
    is_significant: pValue < alpha,
    uplift,
  }
}

function buildBinomialSample(name: string, rate: number, n: number): BinomialSample {
  const conversions = Math.min(Math.round(rate * n), n)
  return { name, visitors: n, conversions }
}

// binomial_single: properties holds exactly 1 binomial metric.
export function calculateResults(properties: Properties, confidenceLevel: number): ExperimentResult {
  const { variant_names, metric_values, N } = properties
  const samples = variant_names.map((name, i) => buildBinomialSample(name, metric_values[i][0], N[i][0]))
  const control = samples[0]
  const challengers = samples.slice(1)
  const alpha = (1 - confidenceLevel) / Math.max(challengers.length, 1)
  const controlRate = control.visitors > 0 ? control.conversions / control.visitors : 0
  return {
    control: {
      name: control.name,
      conversion_rate: controlRate,
      z_score: 0,
      p_value: 1,
      is_significant: false,
      uplift: 0,
    },
    challengers: challengers.map(c => zTest(control, c, alpha)),
  }
}

// multiple_measures: per-metric dispatch on metric_types[m].
export function calculateMultipleMeasuresResults(
  properties: Properties,
  confidenceLevel: number
): MetricResult[] {
  const { variant_names, metric_names, metric_types, metric_values, N, std_dev, visitor_group_labels } = properties
  const numMetrics = metric_names.length
  const numChallengers = Math.max(variant_names.length - 1, 1)
  const alpha = (1 - confidenceLevel) / numChallengers

  const results: MetricResult[] = []
  for (let m = 0; m < numMetrics; m++) {
    const kind = metric_types[m]
    const visitorGroupLabel = visitor_group_labels[m] ?? ''

    if (kind === 'no_test') {
      const controlVal = metric_values[0][m]
      results.push({
        type: 'no_test',
        metricName: metric_names[m],
        visitorGroupLabel,
        control: { name: variant_names[0], value: controlVal },
        challengers: variant_names.slice(1).map((name, i) => {
          const value = metric_values[i + 1][m]
          const uplift = controlVal === 0 ? 0 : ((value - controlVal) / controlVal) * 100
          return { name, value, uplift }
        }),
      })
    } else if (kind === 'continuous') {
      const samples = variant_names.map((name, i) =>
        buildContinuousSample(name, metric_values[i][m], std_dev?.[i]?.[m] ?? null, N[i][m])
      )
      const control = samples[0]
      results.push({
        type: 'continuous',
        metricName: metric_names[m],
        visitorGroupLabel,
        control: {
          name: control.name,
          mean: control.mean,
          sample_size: control.sample_size,
          std_dev_estimated: control.std_dev_estimated,
        },
        challengers: samples.slice(1).map(c => welchTest(control, c, alpha)),
      })
    } else {
      const samples = variant_names.map((name, i) => buildBinomialSample(name, metric_values[i][m], N[i][m]))
      const control = samples[0]
      const controlRate = control.visitors > 0 ? control.conversions / control.visitors : 0
      results.push({
        type: 'binomial',
        metricName: metric_names[m],
        visitorGroupLabel,
        control: { name: control.name, rate: controlRate },
        challengers: samples.slice(1).map(c => zTest(control, c, alpha)),
      })
    }
  }
  return results
}
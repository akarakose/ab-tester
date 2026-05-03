import type { ExperimentResult, MetricResult, Properties, VariantResult } from '@/types/experiment'

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

function buildSample(name: string, rate: number, n: number): BinomialSample {
  const conversions = Math.min(Math.round(rate * n), n)
  return { name, visitors: n, conversions }
}

// For binomial_single: properties holds exactly 1 metric.
export function calculateResults(properties: Properties, confidenceLevel: number): ExperimentResult {
  const { variant_names, metric_values, N } = properties
  const samples = variant_names.map((name, i) => buildSample(name, metric_values[i][0], N[i][0]))
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

// For multiple_measures: one MetricResult per metric.
export function calculateMultipleMeasuresResults(
  properties: Properties,
  confidenceLevel: number
): MetricResult[] {
  const { variant_names, metric_names, metric_values, N, visitor_group_labels } = properties
  const numMetrics = metric_names.length
  const numChallengers = Math.max(variant_names.length - 1, 1)
  const alpha = (1 - confidenceLevel) / numChallengers

  const results: MetricResult[] = []
  for (let m = 0; m < numMetrics; m++) {
    const samples = variant_names.map((name, i) =>
      buildSample(name, metric_values[i][m], N[i][m])
    )
    const control = samples[0]
    const controlRate = control.visitors > 0 ? control.conversions / control.visitors : 0
    results.push({
      metricName: metric_names[m],
      visitorGroupLabel: visitor_group_labels[m] ?? '',
      control: { name: control.name, rate: controlRate },
      challengers: samples.slice(1).map(c => zTest(control, c, alpha)),
    })
  }
  return results
}
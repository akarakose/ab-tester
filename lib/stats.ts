import type { Variant, VariantResult, ExperimentResult } from '@/types/experiment'

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

function zTest(control: Variant, challenger: Variant, alpha: number): VariantResult {
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

export function calculateResults(variants: Variant[], confidenceLevel: number): ExperimentResult {
  const control = variants[0]
  const challengers = variants.slice(1)

  // Bonferroni correction: divide alpha by number of comparisons to account for multiple testing
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
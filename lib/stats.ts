import type { ExperimentResult } from '@/types/experiment'

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

export function calculateResults(
  controlVisitors: number,
  controlConversions: number,
  variantVisitors: number,
  variantConversions: number,
  confidenceLevel: number
): ExperimentResult {
  const controlRate = controlConversions / controlVisitors
  const variantRate = variantConversions / variantVisitors

  const pPool = (controlConversions + variantConversions) / (controlVisitors + variantVisitors)
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / controlVisitors + 1 / variantVisitors))

  const zScore = se === 0 ? 0 : (variantRate - controlRate) / se
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // confidenceLevel is stored as a decimal (e.g. 0.95), alpha is the threshold for rejection
  const alpha = 1 - confidenceLevel
  const isSignificant = pValue < alpha

  return { control_rate: controlRate, variant_rate: variantRate, z_score: zScore, p_value: pValue, is_significant: isSignificant }
}

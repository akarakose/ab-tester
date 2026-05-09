import type {
  ContinuousExperimentResult,
  ContinuousVariantResult,
  Properties,
} from '@/types/experiment'

// Lanczos approximation for log-gamma (g=7, n=9). Accurate to ~1e-15 for x > 0.5.
const LANCZOS_G = 7
const LANCZOS_COEF = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
]

function logGamma(x: number): number {
  if (x < 0.5) {
    // Reflection formula
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  }
  x -= 1
  let a = LANCZOS_COEF[0]
  const t = x + LANCZOS_G + 0.5
  for (let i = 1; i < LANCZOS_COEF.length; i++) {
    a += LANCZOS_COEF[i] / (x + i)
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

// Regularized incomplete beta I_x(a,b) via continued fraction (Lentz's method).
// Reference: Numerical Recipes, betacf.
function betacf(a: number, b: number, x: number): number {
  const MAX_ITER = 200
  const EPS = 3e-12
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b)
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta)
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betacf(a, b, x)) / a
  }
  return 1 - (front * betacf(b, a, 1 - x)) / b
}

// Two-tailed p-value for Student's t with df degrees of freedom.
function tCDFTwoTailed(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return 1
  const x = df / (df + t * t)
  return regularizedIncompleteBeta(df / 2, 0.5, x)
}

// Inverse two-tailed t critical value for given alpha (P(|T| >= tcrit) = alpha).
// Uses bisection on the regularized incomplete beta.
function tInverseTwoTailed(alpha: number, df: number): number {
  if (alpha <= 0) return Infinity
  if (alpha >= 1) return 0
  let lo = 0
  let hi = 1e6
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const p = tCDFTwoTailed(mid, df)
    if (Math.abs(p - alpha) < 1e-10) return mid
    if (p > alpha) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export type ContinuousSample = {
  name: string
  mean: number
  std_dev: number
  sample_size: number
  std_dev_estimated: boolean
}

export function welchTest(control: ContinuousSample, challenger: ContinuousSample, alpha: number): ContinuousVariantResult {
  const m1 = control.mean
  const m2 = challenger.mean
  const v1 = control.std_dev * control.std_dev
  const v2 = challenger.std_dev * challenger.std_dev
  const n1 = control.sample_size
  const n2 = challenger.sample_size

  const se = Math.sqrt(v1 / n1 + v2 / n2)
  const diff = m2 - m1
  const t = se === 0 ? 0 : diff / se

  const num = (v1 / n1 + v2 / n2) ** 2
  const den = (v1 * v1) / (n1 * n1 * (n1 - 1)) + (v2 * v2) / (n2 * n2 * (n2 - 1))
  const df = den === 0 ? n1 + n2 - 2 : num / den

  const pValue = tCDFTwoTailed(Math.abs(t), df)
  const tCrit = tInverseTwoTailed(alpha, df)
  const ciLo = diff - tCrit * se
  const ciHi = diff + tCrit * se

  // Cohen's d_s for unequal variances: pooled = sqrt((s1^2 + s2^2) / 2)
  const sPooled = Math.sqrt((v1 + v2) / 2)
  const cohensD = sPooled === 0 ? 0 : diff / sPooled

  const uplift = m1 === 0 ? 0 : ((m2 - m1) / m1) * 100

  return {
    name: challenger.name,
    mean: m2,
    sample_size: n2,
    ci_lo: ciLo,
    ci_hi: ciHi,
    p_value: pValue,
    is_significant: pValue < alpha,
    uplift,
    cohens_d: cohensD,
    std_dev_estimated: challenger.std_dev_estimated,
  }
}

export function buildContinuousSample(name: string, mean: number, stdDev: number | null, n: number): ContinuousSample {
  const estimated = stdDev === null
  const sd = estimated ? Math.sqrt(Math.max(mean, 0)) : (stdDev as number)
  return { name, mean, std_dev: sd, sample_size: n, std_dev_estimated: estimated }
}

// continuous_single: properties has 1 metric, std_dev is 2D (i x 1).
export function calculateContinuousResults(
  properties: Properties,
  confidenceLevel: number
): ContinuousExperimentResult {
  const { variant_names, metric_values, N, std_dev } = properties
  const samples = variant_names.map((name, i) =>
    buildContinuousSample(name, metric_values[i][0], std_dev?.[i]?.[0] ?? null, N[i][0])
  )
  const control = samples[0]
  const challengers = samples.slice(1)
  const alpha = (1 - confidenceLevel) / Math.max(challengers.length, 1)

  return {
    control: {
      name: control.name,
      mean: control.mean,
      sample_size: control.sample_size,
      std_dev_estimated: control.std_dev_estimated,
    },
    challengers: challengers.map(c => welchTest(control, c, alpha)),
  }
}

export function cohensDLabel(d: number): 'small' | 'medium' | 'large' | null {
  const abs = Math.abs(d)
  if (abs >= 0.8) return 'large'
  if (abs >= 0.5) return 'medium'
  if (abs >= 0.2) return 'small'
  return null
}
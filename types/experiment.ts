export type ExperimentStatus = 'draft' | 'running' | 'concluded'
export type ExperimentType = 'binomial_single' | 'continuous_single' | 'multiple_measures'
export type MetricKind = 'binomial' | 'continuous' | 'no_test'

export type Properties = {
  experiment_type: ExperimentType
  variant_names: string[]
  metric_names: string[]
  metric_types: MetricKind[]
  metric_values: number[][]
  N: number[][]
  std_dev: (number | null)[][] | null
  visitor_group_labels: string[]
  metric_formats?: string[]   // per-metric display format; absent on old experiments
  visitor_source_metric?: (string | null)[]   // per-metric: name of no_test row supplying visitors (null = manual entry)
  metric_tested?: boolean[]   // per-metric: false = skip the significance test (binomial/continuous only). Missing = treat as true.
  sheet_source?: { url: string; gid: number }   // when imported from Google Sheets, the original URL + tab id (snapshot)
}

export type Experiment = {
  id: string
  user_id: string
  name: string
  status: ExperimentStatus
  confidence_level: number
  ai_summary: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  properties: Properties
}

export type VariantResult = {
  name: string
  conversion_rate: number
  z_score: number
  p_value: number
  is_significant: boolean
  uplift: number
}

export type ExperimentResult = {
  control: VariantResult
  challengers: VariantResult[]
}

export type ContinuousVariantResult = {
  name: string
  mean: number
  sample_size: number
  ci_lo: number
  ci_hi: number
  p_value: number
  is_significant: boolean
  uplift: number
  cohens_d: number
  std_dev_estimated: boolean
}

export type ContinuousExperimentResult = {
  control: { name: string; mean: number; sample_size: number; std_dev_estimated: boolean }
  challengers: ContinuousVariantResult[]
}

export type BinomialMetricResult = {
  type: 'binomial'
  tested: boolean              // false = skipped test; challenger p_value/z_score are NaN
  metricName: string
  visitorGroupLabel: string
  control: { name: string; rate: number }
  challengers: VariantResult[]
}

export type ContinuousMetricResult = {
  type: 'continuous'
  tested: boolean              // false = skipped test; challenger p_value/ci/cohen are NaN
  metricName: string
  visitorGroupLabel: string
  control: { name: string; mean: number; sample_size: number; std_dev_estimated: boolean }
  challengers: ContinuousVariantResult[]
}

export type NoTestVariantResult = {
  name: string
  value: number
  uplift: number
}

export type NoTestMetricResult = {
  type: 'no_test'
  metricName: string
  visitorGroupLabel: string
  control: { name: string; value: number }
  challengers: NoTestVariantResult[]
}

export type MetricResult = BinomialMetricResult | ContinuousMetricResult | NoTestMetricResult
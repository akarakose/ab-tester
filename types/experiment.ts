export type ExperimentStatus = 'draft' | 'running' | 'concluded'
export type ExperimentType = 'binomial_single' | 'continuous_single' | 'multiple_measures'

export type Properties = {
  experiment_type: ExperimentType
  variant_names: string[]
  metric_names: string[]
  metric_values: number[][]
  N: number[][]
  std_dev: (number | null)[][] | null
  visitor_group_labels: string[]
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

export type MetricResult = {
  metricName: string
  visitorGroupLabel: string
  control: { name: string; rate: number }
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
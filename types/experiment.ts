export type ExperimentStatus = 'draft' | 'running' | 'concluded'

export type Experiment = {
  id: string
  user_id: string
  name: string
  status: ExperimentStatus
  control_visitors: number
  control_conversions: number
  variant_visitors: number
  variant_conversions: number
  confidence_level: number
  ai_summary: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ExperimentResult = {
  control_rate: number
  variant_rate: number
  z_score: number
  p_value: number
  is_significant: boolean
}

export type CreateExperimentInput = {
  name: string
  control_visitors: number
  control_conversions: number
  variant_visitors: number
  variant_conversions: number
  confidence_level: number
}
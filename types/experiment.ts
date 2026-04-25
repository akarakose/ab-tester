export type ExperimentStatus = 'draft' | 'running' | 'concluded'

export type Variant = {
  name: string
  visitors: number
  conversions: number
}

export type Experiment = {
  id: string
  user_id: string
  name: string
  status: ExperimentStatus
  variants: Variant[]
  confidence_level: number
  ai_summary: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
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

export type CreateExperimentInput = {
  name: string
  variants: Variant[]
  confidence_level: number
}
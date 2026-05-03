export type ExperimentFieldErrors = {
  name?: string
  confidence_level?: string
  variants?: string
}

export type ExperimentActionState = {
  error?: string
  fieldErrors?: ExperimentFieldErrors
} | undefined

export type SortField = 'name' | 'created_at' | 'updated_at' | 'status'
export type SortOrder = 'asc' | 'desc'

export type ExperimentFilters = {
  name?: string
  status?: string
  createdFrom?: string
  createdTo?: string
  updatedFrom?: string
  updatedTo?: string
}

export type CsvMetricInput = {
  name: string
  rates: number[]
  visitors: number[]
  visitorGroupLabel?: string
}

export type CsvExperimentInput = {
  experimentName: string
  variantNames: string[]
  metrics: CsvMetricInput[]
  confidenceLevel: number
}

export type CsvExperimentUpdateInput = {
  name: string
  status: string
  variantNames: string[]
  metrics: CsvMetricInput[]
  confidenceLevel: number
}
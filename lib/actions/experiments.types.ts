export type ExperimentFieldErrors = {
  name?: string
  confidence_level?: string
  variants?: string
  metric_name?: string
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
  type: 'binomial' | 'continuous' | 'no_test'
  values: number[]                    // rates 0..100 for binomial; means for continuous; raw values for no_test
  visitors: number[]                  // visitors for binomial; sample_sizes for continuous; ignored for no_test
  std_devs?: (number | null)[]        // continuous only; per-variant; null = Poisson estimate
  visitorGroupLabel?: string
  format?: string                     // display format detected at upload time (see lib/format.ts fmtValue)
  visitorSourceMetric?: string        // name of a no_test metric whose values populate this metric's visitor counts
  tested?: boolean                    // binomial/continuous only; false = skip the significance test (default true)
}

export type SheetSource = { url: string; gid: number }

export type CsvExperimentInput = {
  experimentName: string
  variantNames: string[]
  metrics: CsvMetricInput[]
  confidenceLevel: number
  sheetSource?: SheetSource
}

export type CsvExperimentUpdateInput = {
  name: string
  status: string
  variantNames: string[]
  metrics: CsvMetricInput[]
  confidenceLevel: number
  sheetSource?: SheetSource
}
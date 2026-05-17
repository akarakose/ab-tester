'use server'

import * as Sentry from '@sentry/nextjs'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Experiment, ExperimentType, Properties } from '@/types/experiment'
import type {
  CsvExperimentInput,
  CsvExperimentUpdateInput,
  CsvMetricInput,
  ExperimentActionState,
  ExperimentFilters,
  SortField,
  SortOrder,
} from './experiments.types'

function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

function sanitizeSheetSource(s: { url: string; gid: number } | undefined): { url: string; gid: number } | undefined {
  if (!s) return undefined
  if (typeof s.url !== 'string' || typeof s.gid !== 'number') return undefined
  // Only allow Google Sheets URLs to avoid storing arbitrary content as a "source".
  try {
    const u = new URL(s.url)
    if (u.hostname !== 'docs.google.com') return undefined
  } catch {
    return undefined
  }
  if (!Number.isInteger(s.gid) || s.gid < 0) return undefined
  return { url: s.url, gid: s.gid }
}

function isNextInternalError(error: unknown): boolean {
  return ((error as { digest?: string })?.digest ?? '').startsWith('NEXT_')
}

const VALID_STATUSES = ['draft', 'running', 'concluded'] as const
const STATUS_ORDER: Record<string, number> = { running: 0, draft: 1, concluded: 2 }
const MAX_VARIANTS = 6
const MIN_VARIANTS = 2
const MAX_METRICS = 300
const MAX_NAME_LENGTH = 200
const MAX_LABEL_LENGTH = 100

const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return { supabase, user: session.user }
})

function revalidateExperimentPaths(id?: string) {
  revalidatePath('/dashboard/experiments')
  if (id) revalidatePath(`/dashboard/experiments/${id}`)
}

function validateCommonFields({ name, confidence, status }: { name: string; confidence: number; status?: string }): string | null {
  if (!name) return 'Experiment name is required.'
  if (name.length > MAX_NAME_LENGTH) return `Experiment name must be ${MAX_NAME_LENGTH} characters or fewer.`
  if (!Number.isFinite(confidence) || confidence < 50 || confidence >= 100) return 'Confidence level must be between 50 and 99.9.'
  if (status !== undefined && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) return 'Invalid status.'
  return null
}

type ParseError = { error: string; field?: 'metric_name' | 'variants' }

function parseBinomialSingle(formData: FormData): { properties: Properties } | ParseError {
  const count = Number(formData.get('variant_count'))
  if (!Number.isInteger(count) || count < MIN_VARIANTS) return { error: 'At least 2 variants (control + one challenger) are required.', field: 'variants' }
  if (count > MAX_VARIANTS) return { error: `Maximum ${MAX_VARIANTS} variants allowed.`, field: 'variants' }

  const variantNames: string[] = []
  const N: number[][] = []
  const metricValues: number[][] = []

  for (let i = 0; i < count; i++) {
    const name = sanitizeText((formData.get(`variant_name_${i}`) as string)?.trim() ?? '')
    const visitors = Number(formData.get(`variant_visitors_${i}`))
    const conversions = Number(formData.get(`variant_conversions_${i}`))

    if (!name) return { error: `Variant ${i + 1} must have a name.`, field: 'variants' }
    if (!Number.isFinite(visitors) || !Number.isInteger(visitors) || visitors <= 0) return { error: `"${name}" visitors must be a whole number greater than 0.`, field: 'variants' }
    if (!Number.isFinite(conversions) || !Number.isInteger(conversions) || conversions < 0) return { error: `"${name}" conversions must be a whole number that is not negative.`, field: 'variants' }
    if (conversions > visitors) return { error: `"${name}" conversions cannot exceed visitors.`, field: 'variants' }

    variantNames.push(name)
    N.push([visitors])
    metricValues.push([conversions / visitors])
  }

  if (new Set(variantNames).size !== variantNames.length) return { error: 'Variant names must be unique.', field: 'variants' }

  return {
    properties: {
      experiment_type: 'binomial_single',
      variant_names: variantNames,
      metric_names: ['Conversion'],
      metric_types: ['binomial'],
      metric_values: metricValues,
      N,
      std_dev: null,
      visitor_group_labels: [''],
    },
  }
}

function parseContinuousSingle(formData: FormData): { properties: Properties } | ParseError {
  const count = Number(formData.get('variant_count'))
  if (!Number.isInteger(count) || count < MIN_VARIANTS) return { error: 'At least 2 variants (control + one challenger) are required.', field: 'variants' }
  if (count > MAX_VARIANTS) return { error: `Maximum ${MAX_VARIANTS} variants allowed.`, field: 'variants' }

  const metricName = sanitizeText((formData.get('metric_name') as string)?.trim() ?? '')
  if (!metricName) return { error: 'Metric name is required.', field: 'metric_name' }
  if (metricName.length > MAX_NAME_LENGTH) return { error: `Metric name must be ${MAX_NAME_LENGTH} characters or fewer.`, field: 'metric_name' }

  const variantNames: string[] = []
  const metricValues: number[][] = []
  const N: number[][] = []
  const stdDev: (number | null)[][] = []
  let anyStdDev = false

  for (let i = 0; i < count; i++) {
    const name = sanitizeText((formData.get(`variant_name_${i}`) as string)?.trim() ?? '')
    const mean = Number(formData.get(`variant_mean_${i}`))
    const sampleSize = Number(formData.get(`variant_sample_size_${i}`))
    const stdRaw = (formData.get(`variant_std_dev_${i}`) as string | null)?.trim() ?? ''

    if (!name) return { error: `Variant ${i + 1} must have a name.`, field: 'variants' }
    if (!Number.isFinite(mean) || mean <= 0) return { error: `"${name}" mean must be a positive number.`, field: 'variants' }
    if (!Number.isFinite(sampleSize) || !Number.isInteger(sampleSize) || sampleSize < 2) return { error: `"${name}" sample size must be a whole number of at least 2.`, field: 'variants' }

    let sd: number | null = null
    if (stdRaw !== '') {
      const parsed = Number(stdRaw)
      if (!Number.isFinite(parsed) || parsed <= 0) return { error: `"${name}" std dev must be greater than 0.`, field: 'variants' }
      sd = parsed
      anyStdDev = true
    }

    variantNames.push(name)
    metricValues.push([mean])
    N.push([sampleSize])
    stdDev.push([sd])
  }

  if (new Set(variantNames).size !== variantNames.length) return { error: 'Variant names must be unique.', field: 'variants' }

  return {
    properties: {
      experiment_type: 'continuous_single',
      variant_names: variantNames,
      metric_names: [metricName],
      metric_types: ['continuous'],
      metric_values: metricValues,
      N,
      std_dev: anyStdDev ? stdDev : null,
      visitor_group_labels: [''],
    },
  }
}

function validateMultipleMeasures(input: { variantNames: string[]; metrics: CsvMetricInput[] }): string | null {
  if (!Array.isArray(input.variantNames) || !Array.isArray(input.metrics)) return 'Invalid input shape.'
  if (input.variantNames.length < MIN_VARIANTS) return 'At least 2 variants are required.'
  if (input.variantNames.length > MAX_VARIANTS) return `Maximum ${MAX_VARIANTS} variants allowed.`
  if (input.variantNames.some(n => typeof n !== 'string')) return 'Variant names must be strings.'
  if (input.variantNames.some(n => n.length > MAX_NAME_LENGTH)) return `Variant names must be ${MAX_NAME_LENGTH} characters or fewer.`

  const uniqueVariants = new Set(input.variantNames.map(n => n.toLowerCase()))
  if (uniqueVariants.size !== input.variantNames.length) return 'Variant names must be unique.'

  if (input.metrics.length === 0) return 'At least one metric is required.'
  if (input.metrics.length > MAX_METRICS) return `Maximum ${MAX_METRICS} metrics allowed.`

  const byName = new Map(input.metrics.map(m => [m.name, m]))
  const numVariants = input.variantNames.length
  for (const m of input.metrics) {
    if (typeof m.name !== 'string') return 'Metric names must be strings.'
    if (m.name.length > MAX_NAME_LENGTH) return `Metric names must be ${MAX_NAME_LENGTH} characters or fewer.`
    if (m.type !== 'binomial' && m.type !== 'continuous' && m.type !== 'no_test') return `Metric "${m.name}" has an unknown type.`
    if (m.visitorGroupLabel !== undefined && (typeof m.visitorGroupLabel !== 'string' || m.visitorGroupLabel.length > MAX_LABEL_LENGTH))
      return `Visitor group labels must be strings of ${MAX_LABEL_LENGTH} characters or fewer.`
    if (!Array.isArray(m.values) || !Array.isArray(m.visitors)) return `Metric "${m.name}" has invalid shape.`
    if (m.values.length !== numVariants) return `Metric "${m.name}" needs a value for every variant.`

    if (m.type === 'no_test') {
      if (m.values.some(v => !Number.isFinite(v))) return `Metric "${m.name}" values must be numbers.`
      if (m.visitorSourceMetric !== undefined) return `Metric "${m.name}" is a no-test metric and cannot have a visitor source.`
      if (m.tested !== undefined) return `Metric "${m.name}" is a no-test metric and cannot toggle the test flag.`
    } else {
      if (m.visitors.length !== numVariants) return `Metric "${m.name}" needs a visitor count for every variant.`
      const tested = m.tested !== false

      if (m.type === 'binomial') {
        if (m.values.some(r => !Number.isFinite(r) || r < 0 || r > 100)) return `Metric "${m.name}" rates must be between 0 and 100.`
        if (tested && m.visitors.some(v => !Number.isFinite(v) || v <= 0 || !Number.isInteger(v))) return `Metric "${m.name}" visitor counts must be whole numbers greater than 0.`
      } else {
        if (m.values.some(v => !Number.isFinite(v) || v <= 0)) return `Metric "${m.name}" means must be positive numbers.`
        if (tested && m.visitors.some(v => !Number.isFinite(v) || v < 2 || !Number.isInteger(v))) return `Metric "${m.name}" sample sizes must be whole numbers of at least 2.`
        if (m.std_devs !== undefined) {
          if (!Array.isArray(m.std_devs) || m.std_devs.length !== numVariants) return `Metric "${m.name}" std devs must be one per variant.`
          if (m.std_devs.some(s => s !== null && (!Number.isFinite(s) || (s as number) <= 0))) return `Metric "${m.name}" std devs must be greater than 0 when provided.`
        }
      }

      if (!tested && m.visitorSourceMetric !== undefined) return `Metric "${m.name}" cannot link a visitor source while skipping the test.`

      if (m.visitorSourceMetric !== undefined) {
        if (typeof m.visitorSourceMetric !== 'string') return `Metric "${m.name}" has an invalid visitor source.`
        const source = byName.get(m.visitorSourceMetric)
        if (!source) return `Metric "${m.name}" links to a missing visitor source "${m.visitorSourceMetric}".`
        if (source.type !== 'no_test') return `Metric "${m.name}" links to "${source.name}" which is not a no-test metric.`
        if (source.values.some(v => !Number.isFinite(v) || v <= 0 || !Number.isInteger(v)))
          return `Visitor source "${source.name}" must have positive whole-number values for every variant.`
        if (m.visitors.some((v, i) => v !== source.values[i]))
          return `Metric "${m.name}" visitor counts do not match its source "${source.name}".`
      }
    }
  }
  return null
}

function buildMultipleMeasuresProperties(
  variantNames: string[],
  metrics: CsvMetricInput[],
  sheetSource?: { url: string; gid: number },
): Properties {
  const numVariants = variantNames.length
  const numMetrics = metrics.length

  const metric_values: number[][] = Array.from({ length: numVariants }, () => Array(numMetrics).fill(0))
  const N: number[][] = Array.from({ length: numVariants }, () => Array(numMetrics).fill(0))
  const std_dev_grid: (number | null)[][] = Array.from({ length: numVariants }, () => Array(numMetrics).fill(null))

  for (let m = 0; m < numMetrics; m++) {
    const metric = metrics[m]
    const isContinuous = metric.type === 'continuous'
    const isNoTest = metric.type === 'no_test'
    const skipTest = metric.tested === false
    for (let v = 0; v < numVariants; v++) {
      metric_values[v][m] = isContinuous || isNoTest ? metric.values[v] : metric.values[v] / 100
      N[v][m] = isNoTest || skipTest ? 0 : metric.visitors[v]
      if (isContinuous) {
        const sd = metric.std_devs?.[v]
        std_dev_grid[v][m] = typeof sd === 'number' && Number.isFinite(sd) && sd > 0 ? sd : null
      }
    }
  }

  const hasAnyContinuous = metrics.some(m => m.type === 'continuous')

  return {
    experiment_type: 'multiple_measures',
    variant_names: variantNames,
    metric_names: metrics.map(m => m.name),
    metric_types: metrics.map(m => m.type),
    metric_values,
    N,
    std_dev: hasAnyContinuous ? std_dev_grid : null,
    visitor_group_labels: metrics.map(m => m.visitorGroupLabel ?? ''),
    metric_formats: metrics.map(m => m.format ?? 'decimal'),
    visitor_source_metric: metrics.map(m => m.visitorSourceMetric ?? null),
    metric_tested: metrics.map(m => m.type === 'no_test' ? false : m.tested !== false),
    ...(sheetSource ? { sheet_source: sheetSource } : {}),
  }
}

export async function getExperiments(
  sortBy: SortField = 'created_at',
  sortOrder: SortOrder = 'desc',
  filters: ExperimentFilters = {}
): Promise<Experiment[]> {
  const { supabase } = await getAuthenticatedUser()

  const dbSortField = sortBy === 'status' ? 'created_at' : sortBy

  let query = supabase
    .from('experiments')
    .select('*')
    .order(dbSortField, { ascending: sortOrder === 'asc' })

  query = filters.archived
    ? query.not('deleted_at', 'is', null)
    : query.is('deleted_at', null)

  if (filters.name) query = query.ilike('name', `%${filters.name}%`)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.createdFrom) query = query.gte('created_at', filters.createdFrom)
  if (filters.createdTo) query = query.lte('created_at', `${filters.createdTo}T23:59:59.999Z`)
  if (filters.updatedFrom) query = query.gte('updated_at', filters.updatedFrom)
  if (filters.updatedTo) query = query.lte('updated_at', `${filters.updatedTo}T23:59:59.999Z`)
  if (filters.folderId === 'unfiled') query = query.is('folder_id', null)
  else if (filters.folderId) query = query.eq('folder_id', filters.folderId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const experiments = data ?? []

  if (sortBy === 'status') {
    experiments.sort((a, b) => {
      const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return sortOrder === 'asc' ? diff : -diff
    })
  }

  return experiments
}

export async function getExperiment(id: string): Promise<Experiment | null> {
  const { supabase } = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createExperiment(
  _prevState: ExperimentActionState,
  formData: FormData
): Promise<ExperimentActionState> {
  try {
    const { supabase, user } = await getAuthenticatedUser()

    const name = sanitizeText((formData.get('name') as string)?.trim() ?? '')
    const confidence = Number(formData.get('confidence_level'))
    const requestedType: ExperimentType = (formData.get('metric_type') as string) === 'continuous'
      ? 'continuous_single'
      : 'binomial_single'

    if (!name) return { fieldErrors: { name: 'Experiment name is required.' } }
    if (name.length > MAX_NAME_LENGTH) return { fieldErrors: { name: `Experiment name must be ${MAX_NAME_LENGTH} characters or fewer.` } }
    if (!Number.isFinite(confidence) || confidence < 50 || confidence >= 100) return { fieldErrors: { confidence_level: 'Confidence level must be between 50 and 99.9.' } }

    const parsed = requestedType === 'continuous_single' ? parseContinuousSingle(formData) : parseBinomialSingle(formData)
    if ('error' in parsed) return { fieldErrors: { [parsed.field ?? 'variants']: parsed.error } }

    const { data: inserted, error } = await supabase
      .from('experiments')
      .insert({
        user_id: user.id,
        name,
        status: 'draft',
        confidence_level: confidence / 100,
        properties: parsed.properties,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    revalidateExperimentPaths(inserted.id)
    redirect(`/dashboard/experiments/${inserted.id}`)
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function updateExperiment(
  id: string,
  _prevState: ExperimentActionState,
  formData: FormData
): Promise<ExperimentActionState> {
  try {
    const { supabase } = await getAuthenticatedUser()

    const name = sanitizeText((formData.get('name') as string)?.trim() ?? '')
    const confidence = Number(formData.get('confidence_level'))
    const status = formData.get('status') as string

    if (!name) return { fieldErrors: { name: 'Experiment name is required.' } }
    if (name.length > MAX_NAME_LENGTH) return { fieldErrors: { name: `Experiment name must be ${MAX_NAME_LENGTH} characters or fewer.` } }
    if (!Number.isFinite(confidence) || confidence < 50 || confidence >= 100) return { fieldErrors: { confidence_level: 'Confidence level must be between 50 and 99.9.' } }
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) return { error: 'Invalid status.' }

    const { data: existing, error: fetchError } = await supabase
      .from('experiments')
      .select('properties')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (fetchError || !existing) return { error: 'Experiment not found.' }

    const existingType = (existing.properties as Properties)?.experiment_type
    const parsed =
      existingType === 'continuous_single' ? parseContinuousSingle(formData)
      : existingType === 'binomial_single' ? parseBinomialSingle(formData)
      : null

    if (!parsed) return { error: 'This experiment type cannot be edited from this form.' }
    if ('error' in parsed) return { fieldErrors: { [parsed.field ?? 'variants']: parsed.error } }

    const { error } = await supabase
      .from('experiments')
      .update({
        name,
        status,
        confidence_level: confidence / 100,
        properties: parsed.properties,
      })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidateExperimentPaths(id)
    redirect(`/dashboard/experiments/${id}`)
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function createExperimentsFromCsv(
  input: CsvExperimentInput
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    const experimentName = sanitizeText(input.experimentName)
    const variantNames = input.variantNames.map(sanitizeText)
    const metrics: CsvMetricInput[] = input.metrics.map(m => ({
      name: sanitizeText(m.name),
      type: m.type,
      values: m.values,
      visitors: m.visitors,
      ...(m.std_devs !== undefined ? { std_devs: m.std_devs } : {}),
      ...(m.visitorGroupLabel ? { visitorGroupLabel: sanitizeText(m.visitorGroupLabel) } : {}),
      ...(m.format ? { format: m.format } : {}),
      ...(m.visitorSourceMetric ? { visitorSourceMetric: sanitizeText(m.visitorSourceMetric) } : {}),
      ...(m.tested === false ? { tested: false } : {}),
    }))
    const { confidenceLevel } = input
    const sheetSource = sanitizeSheetSource(input.sheetSource)

    const baseError = validateCommonFields({ name: experimentName, confidence: confidenceLevel })
    if (baseError) return { error: baseError }

    const csvError = validateMultipleMeasures({ variantNames, metrics })
    if (csvError) return { error: csvError }

    const properties = buildMultipleMeasuresProperties(variantNames, metrics, sheetSource)

    const { data: inserted, error } = await supabase
      .from('experiments')
      .insert({
        user_id: user.id,
        name: experimentName,
        status: 'draft' as const,
        confidence_level: confidenceLevel / 100,
        properties,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    revalidateExperimentPaths(inserted.id)
    redirect(`/dashboard/experiments/${inserted.id}`)
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function updateCsvExperiment(
  id: string,
  input: CsvExperimentUpdateInput
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAuthenticatedUser()
    const name = sanitizeText(input.name)
    const variantNames = input.variantNames.map(sanitizeText)
    const metrics: CsvMetricInput[] = input.metrics.map(m => ({
      name: sanitizeText(m.name),
      type: m.type,
      values: m.values,
      visitors: m.visitors,
      ...(m.std_devs !== undefined ? { std_devs: m.std_devs } : {}),
      ...(m.visitorGroupLabel ? { visitorGroupLabel: sanitizeText(m.visitorGroupLabel) } : {}),
      ...(m.format ? { format: m.format } : {}),
      ...(m.visitorSourceMetric ? { visitorSourceMetric: sanitizeText(m.visitorSourceMetric) } : {}),
      ...(m.tested === false ? { tested: false } : {}),
    }))
    const { status, confidenceLevel } = input
    const sheetSource = sanitizeSheetSource(input.sheetSource)

    const baseError = validateCommonFields({ name, confidence: confidenceLevel, status })
    if (baseError) return { error: baseError }

    const csvError = validateMultipleMeasures({ variantNames, metrics })
    if (csvError) return { error: csvError }

    const properties = buildMultipleMeasuresProperties(variantNames, metrics, sheetSource)

    const { error } = await supabase
      .from('experiments')
      .update({ name, status, confidence_level: confidenceLevel / 100, properties })
      .eq('id', id)

    if (error) return { error: error.message }

    revalidateExperimentPaths(id)
    redirect(`/dashboard/experiments/${id}`)
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function archiveExperiment(id: string): Promise<{ error: string } | void> {
  try {
    const { supabase } = await getAuthenticatedUser()
    const { error } = await supabase
      .from('experiments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidateExperimentPaths(id)
    redirect('/dashboard/experiments')
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function restoreExperiment(id: string): Promise<{ error: string } | void> {
  try {
    const { supabase } = await getAuthenticatedUser()
    const { error } = await supabase
      .from('experiments')
      .update({ deleted_at: null })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidateExperimentPaths(id)
    redirect(`/dashboard/experiments/${id}`)
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function bulkArchiveExperiments(ids: string[]): Promise<{ error?: string; count?: number }> {
  try {
    if (ids.length === 0) return { count: 0 }
    const { supabase } = await getAuthenticatedUser()
    const { error, count } = await supabase
      .from('experiments')
      .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
      .in('id', ids)
      .is('deleted_at', null)
    if (error) return { error: error.message }
    revalidateExperimentPaths()
    return { count: count ?? 0 }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function bulkRestoreExperiments(ids: string[]): Promise<{ error?: string; count?: number }> {
  try {
    if (ids.length === 0) return { count: 0 }
    const { supabase } = await getAuthenticatedUser()
    const { error, count } = await supabase
      .from('experiments')
      .update({ deleted_at: null }, { count: 'exact' })
      .in('id', ids)
      .not('deleted_at', 'is', null)
    if (error) return { error: error.message }
    revalidateExperimentPaths()
    return { count: count ?? 0 }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function bulkMoveExperimentsToFolder(
  ids: string[],
  folderId: string | null,
): Promise<{ error?: string; count?: number }> {
  try {
    if (ids.length === 0) return { count: 0 }
    const { supabase } = await getAuthenticatedUser()
    const { error, count } = await supabase
      .from('experiments')
      .update({ folder_id: folderId }, { count: 'exact' })
      .in('id', ids)
    if (error) return { error: error.message }
    revalidatePath('/dashboard/experiments')
    return { count: count ?? 0 }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function bulkPermanentlyDeleteExperiments(ids: string[]): Promise<{ error?: string; count?: number }> {
  try {
    if (ids.length === 0) return { count: 0 }
    const { supabase } = await getAuthenticatedUser()
    const { error, count } = await supabase
      .from('experiments')
      .delete({ count: 'exact' })
      .in('id', ids)
    if (error) return { error: error.message }
    revalidateExperimentPaths()
    return { count: count ?? 0 }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function permanentlyDeleteExperiment(
  id: string,
  fromArchived: boolean = false,
): Promise<{ error: string } | void> {
  try {
    const { supabase } = await getAuthenticatedUser()
    const { error } = await supabase
      .from('experiments')
      .delete()
      .eq('id', id)
    if (error) return { error: error.message }
    revalidateExperimentPaths(id)
    redirect(fromArchived ? '/dashboard/experiments?archived=1' : '/dashboard/experiments')
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
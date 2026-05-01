'use server'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Experiment, Variant } from '@/types/experiment'
import type {
  CsvExperimentInput,
  CsvExperimentUpdateInput,
  CsvMetricInput,
  ExperimentActionState,
  ExperimentFilters,
  SortField,
  SortOrder,
} from './experiments.types'

const VALID_STATUSES = ['draft', 'running', 'concluded'] as const
const STATUS_ORDER: Record<string, number> = { running: 0, draft: 1, concluded: 2 }
const MAX_VARIANTS = 6
const MIN_VARIANTS = 2

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
  if (confidence < 50 || confidence >= 100) return 'Confidence level must be between 50 and 99.9.'
  if (status !== undefined && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) return 'Invalid status.'
  return null
}

function parseVariants(formData: FormData): { variants: Variant[] } | { error: string } {
  const count = Number(formData.get('variant_count'))
  if (!Number.isInteger(count) || count < MIN_VARIANTS) return { error: 'At least 2 variants (control + one challenger) are required.' }
  if (count > MAX_VARIANTS) return { error: `Maximum ${MAX_VARIANTS} variants allowed.` }

  const variants: Variant[] = []
  for (let i = 0; i < count; i++) {
    const name = (formData.get(`variant_name_${i}`) as string)?.trim()
    const visitors = Number(formData.get(`variant_visitors_${i}`))
    const conversions = Number(formData.get(`variant_conversions_${i}`))

    if (!name) return { error: `Variant ${i + 1} must have a name.` }
    if (visitors <= 0) return { error: `"${name}" visitors must be greater than 0.` }
    if (conversions < 0) return { error: `"${name}" conversions cannot be negative.` }
    if (conversions > visitors) return { error: `"${name}" conversions cannot exceed visitors.` }

    variants.push({ name, visitors, conversions })
  }

  const names = variants.map(v => v.name)
  if (new Set(names).size !== names.length) return { error: 'Variant names must be unique.' }

  return { variants }
}

function validateCsvBase(input: { variantNames: string[]; metrics: CsvMetricInput[] }): string | null {
  if (input.variantNames.length < MIN_VARIANTS) return 'At least 2 variants are required.'
  if (input.metrics.length === 0) return 'At least one metric is required.'

  for (const m of input.metrics) {
    if (m.visitors.length !== input.variantNames.length) return 'Each metric needs a visitor count for every variant.'
    if (m.visitors.some(v => !Number.isFinite(v) || v <= 0)) return 'All visitor counts must be greater than 0.'
  }
  return null
}

function buildCsvPayload(variantNames: string[], metrics: CsvMetricInput[]): { variants: Variant[]; metrics: CsvMetricInput[] } {
  const defaultVisitors = metrics[0].visitors
  const variants: Variant[] = variantNames.map((name, i) => ({
    name,
    visitors: defaultVisitors[i],
    conversions: 0,
  }))
  const cleanedMetrics = metrics.map(({ name, rates, visitors, visitorGroupLabel }) => ({
    name,
    rates,
    visitors,
    ...(visitorGroupLabel ? { visitorGroupLabel } : {}),
  }))
  return { variants, metrics: cleanedMetrics }
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
    .is('deleted_at', null)
    .order(dbSortField, { ascending: sortOrder === 'asc' })

  if (filters.name) query = query.ilike('name', `%${filters.name}%`)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.createdFrom) query = query.gte('created_at', filters.createdFrom)
  if (filters.createdTo) query = query.lte('created_at', `${filters.createdTo}T23:59:59.999Z`)
  if (filters.updatedFrom) query = query.gte('updated_at', filters.updatedFrom)
  if (filters.updatedTo) query = query.lte('updated_at', `${filters.updatedTo}T23:59:59.999Z`)

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
    .is('deleted_at', null)
    .single()
  if (error) return null
  return data
}

export async function createExperiment(
  _prevState: ExperimentActionState,
  formData: FormData
): Promise<ExperimentActionState> {
  const { supabase, user } = await getAuthenticatedUser()

  const name = (formData.get('name') as string)?.trim()
  const confidence = Number(formData.get('confidence_level'))

  const baseError = validateCommonFields({ name, confidence })
  if (baseError) return { error: baseError }

  const parsed = parseVariants(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase.from('experiments').insert({
    user_id: user.id,
    name,
    status: 'draft',
    variants: parsed.variants,
    confidence_level: confidence / 100,
  })

  if (error) return { error: error.message }

  revalidateExperimentPaths()
  redirect('/dashboard/experiments')
}

export async function updateExperiment(
  id: string,
  _prevState: ExperimentActionState,
  formData: FormData
): Promise<ExperimentActionState> {
  const { supabase } = await getAuthenticatedUser()

  const name = (formData.get('name') as string)?.trim()
  const confidence = Number(formData.get('confidence_level'))
  const status = formData.get('status') as string

  const baseError = validateCommonFields({ name, confidence, status })
  if (baseError) return { error: baseError }

  const parsed = parseVariants(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase
    .from('experiments')
    .update({
      name,
      status,
      variants: parsed.variants,
      confidence_level: confidence / 100,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateExperimentPaths(id)
  redirect(`/dashboard/experiments/${id}`)
}

export async function createExperimentsFromCsv(
  input: CsvExperimentInput
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()
  const { experimentName, variantNames, metrics, confidenceLevel } = input

  const baseError = validateCommonFields({ name: experimentName, confidence: confidenceLevel })
  if (baseError) return { error: baseError }

  const csvError = validateCsvBase({ variantNames, metrics })
  if (csvError) return { error: csvError }

  const { variants, metrics: csvMetrics } = buildCsvPayload(variantNames, metrics)

  const { error } = await supabase.from('experiments').insert({
    user_id: user.id,
    name: experimentName,
    status: 'draft' as const,
    variants,
    metrics: csvMetrics,
    confidence_level: confidenceLevel / 100,
  })

  if (error) return { error: error.message }

  revalidateExperimentPaths()
  return {}
}

export async function updateCsvExperiment(
  id: string,
  input: CsvExperimentUpdateInput
): Promise<{ error?: string }> {
  const { supabase } = await getAuthenticatedUser()
  const { name, status, variantNames, metrics, confidenceLevel } = input

  const baseError = validateCommonFields({ name, confidence: confidenceLevel, status })
  if (baseError) return { error: baseError }

  const csvError = validateCsvBase({ variantNames, metrics })
  if (csvError) return { error: csvError }

  const { variants, metrics: csvMetrics } = buildCsvPayload(variantNames, metrics)

  const { error } = await supabase
    .from('experiments')
    .update({ name, status, variants, metrics: csvMetrics, confidence_level: confidenceLevel / 100 })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateExperimentPaths(id)
  redirect(`/dashboard/experiments/${id}`)
}

export async function deleteExperiment(id: string): Promise<{ error: string } | void> {
  const { supabase } = await getAuthenticatedUser()
  const { error } = await supabase
    .from('experiments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidateExperimentPaths()
  redirect('/dashboard/experiments')
}
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Experiment, Variant } from '@/types/experiment'

export type ExperimentActionState = { error?: string } | undefined

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

function parseVariants(formData: FormData): { variants: Variant[] } | { error: string } {
  const countRaw = formData.get('variant_count')
  const count = Number(countRaw)
  if (!Number.isInteger(count) || count < 2) return { error: 'At least 2 variants (control + one challenger) are required.' }
  if (count > 6) return { error: 'Maximum 6 variants allowed.' }

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

const STATUS_ORDER: Record<string, number> = { running: 0, draft: 1, concluded: 2 }

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
  const confidencePct = Number(formData.get('confidence_level'))

  if (!name) return { error: 'Experiment name is required.' }
  if (confidencePct < 50 || confidencePct >= 100) return { error: 'Confidence level must be between 50 and 99.9.' }

  const parsed = parseVariants(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase.from('experiments').insert({
    user_id: user.id,
    name,
    status: 'draft',
    variants: parsed.variants,
    confidence_level: confidencePct / 100,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/experiments')
  redirect('/dashboard/experiments')
}

export async function updateExperiment(
  id: string,
  _prevState: ExperimentActionState,
  formData: FormData
): Promise<ExperimentActionState> {
  const { supabase } = await getAuthenticatedUser()

  const name = (formData.get('name') as string)?.trim()
  const confidencePct = Number(formData.get('confidence_level'))
  const status = formData.get('status') as string

  if (!name) return { error: 'Experiment name is required.' }
  if (confidencePct < 50 || confidencePct >= 100) return { error: 'Confidence level must be between 50 and 99.9.' }
  if (!['draft', 'running', 'concluded'].includes(status)) return { error: 'Invalid status.' }

  const parsed = parseVariants(formData)
  if ('error' in parsed) return { error: parsed.error }

  const { error } = await supabase
    .from('experiments')
    .update({
      name,
      status,
      variants: parsed.variants,
      confidence_level: confidencePct / 100,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/experiments')
  revalidatePath(`/dashboard/experiments/${id}`)
  redirect(`/dashboard/experiments/${id}`)
}

export async function deleteExperiment(id: string): Promise<{ error: string } | void> {
  const { supabase } = await getAuthenticatedUser()
  const { error } = await supabase
    .from('experiments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/experiments')
  redirect('/dashboard/experiments')
}
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Experiment } from '@/types/experiment'

export type ExperimentActionState = { error?: string } | undefined

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function getExperiments(): Promise<Experiment[]> {
  const { supabase } = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
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
  const controlVisitors = Number(formData.get('control_visitors'))
  const controlConversions = Number(formData.get('control_conversions'))
  const variantVisitors = Number(formData.get('variant_visitors'))
  const variantConversions = Number(formData.get('variant_conversions'))
  const confidencePct = Number(formData.get('confidence_level'))

  if (!name) return { error: 'Experiment name is required.' }
  if (controlVisitors <= 0 || variantVisitors <= 0) return { error: 'Visitor counts must be greater than 0.' }
  if (controlConversions < 0 || variantConversions < 0) return { error: 'Conversion counts cannot be negative.' }
  if (controlConversions > controlVisitors) return { error: 'Control conversions cannot exceed control visitors.' }
  if (variantConversions > variantVisitors) return { error: 'Variant conversions cannot exceed variant visitors.' }
  if (confidencePct < 50 || confidencePct >= 100) return { error: 'Confidence level must be between 50 and 99.9.' }

  const { error } = await supabase.from('experiments').insert({
    user_id: user.id,
    name,
    status: 'draft',
    control_visitors: controlVisitors,
    control_conversions: controlConversions,
    variant_visitors: variantVisitors,
    variant_conversions: variantConversions,
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
  const controlVisitors = Number(formData.get('control_visitors'))
  const controlConversions = Number(formData.get('control_conversions'))
  const variantVisitors = Number(formData.get('variant_visitors'))
  const variantConversions = Number(formData.get('variant_conversions'))
  const confidencePct = Number(formData.get('confidence_level'))
  const status = formData.get('status') as string

  if (!name) return { error: 'Experiment name is required.' }
  if (controlVisitors <= 0 || variantVisitors <= 0) return { error: 'Visitor counts must be greater than 0.' }
  if (controlConversions < 0 || variantConversions < 0) return { error: 'Conversion counts cannot be negative.' }
  if (controlConversions > controlVisitors) return { error: 'Control conversions cannot exceed control visitors.' }
  if (variantConversions > variantVisitors) return { error: 'Variant conversions cannot exceed variant visitors.' }
  if (confidencePct < 50 || confidencePct >= 100) return { error: 'Confidence level must be between 50 and 99.9.' }
  if (!['draft', 'running', 'concluded'].includes(status)) return { error: 'Invalid status.' }

  const { error } = await supabase
    .from('experiments')
    .update({
      name,
      status,
      control_visitors: controlVisitors,
      control_conversions: controlConversions,
      variant_visitors: variantVisitors,
      variant_conversions: variantConversions,
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

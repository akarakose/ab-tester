'use server'

import * as Sentry from '@sentry/nextjs'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Folder, FolderBreadcrumb, FolderNode } from '@/types/folder'
import type { FolderActionState } from './folders.types'

const MAX_NAME_LENGTH = 100

function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

function isNextInternalError(error: unknown): boolean {
  return ((error as { digest?: string })?.digest ?? '').startsWith('NEXT_')
}

const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return { supabase, user: session.user }
})

function revalidateFolderPaths() {
  revalidatePath('/dashboard/experiments')
}

function validateName(name: string): string | null {
  if (!name) return 'Folder name is required.'
  if (name.length > MAX_NAME_LENGTH) return `Folder name must be ${MAX_NAME_LENGTH} characters or fewer.`
  return null
}

export async function getFolders(): Promise<Folder[]> {
  const { supabase } = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getFolderTree(): Promise<FolderNode[]> {
  const folders = await getFolders()
  const byId = new Map<string, FolderNode>(
    folders.map(f => [f.id, { ...f, children: [] }])
  )
  const roots: FolderNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export async function getFolder(id: string): Promise<Folder | null> {
  const { supabase } = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function getFolderBreadcrumbs(id: string): Promise<FolderBreadcrumb[]> {
  const folders = await getFolders()
  const byId = new Map(folders.map(f => [f.id, f]))
  const trail: FolderBreadcrumb[] = []
  let cursor: string | null = id
  // Bound the walk to avoid infinite loops on data corruption.
  for (let i = 0; i < folders.length && cursor; i++) {
    const node = byId.get(cursor)
    if (!node) break
    trail.unshift({ id: node.id, name: node.name })
    cursor = node.parent_id
  }
  return trail
}

export async function createFolder(
  _prev: FolderActionState,
  formData: FormData
): Promise<FolderActionState> {
  try {
    const { supabase, user } = await getAuthenticatedUser()
    const name = sanitizeText((formData.get('name') as string)?.trim() ?? '')
    const parentRaw = (formData.get('parent_id') as string | null)?.trim()
    const parent_id = parentRaw ? parentRaw : null

    const nameError = validateName(name)
    if (nameError) return { fieldErrors: { name: nameError } }

    const { data: inserted, error } = await supabase
      .from('folders')
      .insert({ user_id: user.id, name, parent_id })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return { fieldErrors: { name: 'A folder with this name already exists here.' } }
      return { error: error.message }
    }

    revalidateFolderPaths()
    return { message: 'Folder created.', createdId: inserted.id }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function renameFolder(id: string, name: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAuthenticatedUser()
    const trimmed = sanitizeText(name.trim())
    const nameError = validateName(trimmed)
    if (nameError) return { error: nameError }

    const { error } = await supabase
      .from('folders')
      .update({ name: trimmed })
      .eq('id', id)
    if (error) {
      if (error.code === '23505') return { error: 'A folder with this name already exists here.' }
      return { error: error.message }
    }
    revalidateFolderPaths()
    return {}
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function moveFolder(id: string, newParentId: string | null): Promise<{ error?: string }> {
  try {
    if (newParentId === id) return { error: 'A folder cannot be its own parent.' }
    const { supabase } = await getAuthenticatedUser()
    const { error } = await supabase
      .from('folders')
      .update({ parent_id: newParentId })
      .eq('id', id)
    if (error) {
      if (error.message.includes('descendant') || error.message.includes('own parent')) {
        return { error: 'Cannot move a folder into itself or one of its sub-folders.' }
      }
      if (error.code === '23505') return { error: 'A folder with this name already exists in the destination.' }
      return { error: error.message }
    }
    revalidateFolderPaths()
    return {}
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function deleteFolder(id: string): Promise<{ error?: string } | void> {
  try {
    const { supabase } = await getAuthenticatedUser()
    const folder = await getFolder(id)
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
    if (error) return { error: error.message }
    revalidateFolderPaths()
    if (folder?.parent_id) {
      redirect(`/dashboard/experiments?folder=${folder.parent_id}`)
    } else {
      redirect('/dashboard/experiments')
    }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
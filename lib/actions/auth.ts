'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthActionState = {
  error?: string
  message?: string
} | undefined

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

function isNextInternalError(error: unknown): boolean {
  return ((error as { digest?: string })?.digest ?? '').startsWith('NEXT_')
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { error: 'Email and password are required.' }
    }

    if (!isValidEmail(email)) {
      return { error: 'Please enter a valid email address.' }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: error.message }
    }

    redirect('/dashboard')
  } catch (error) {
    if (isNextInternalError(error)) throw error
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { error: 'Email and password are required.' }
    }

    if (!isValidEmail(email)) {
      return { error: 'Please enter a valid email address.' }
    }

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
      })
    }

    if (data.session) {
      redirect('/dashboard')
    }

    return { message: 'Check your email to confirm your account before signing in.' }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function logout() {
  const supabase = await createClient()
  try {
    await supabase.auth.signOut()
  } catch {
    // sign out failed; redirect to login regardless
  }
  redirect('/login')
}
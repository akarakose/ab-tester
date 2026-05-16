'use server'

import { redirect } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  ProfileActionState,
  EmailActionState,
  PasswordActionState,
  PasswordFieldErrors,
} from './account.types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LEN = 8
const MAX_COMPANY_NAME_LEN = 80

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

function isNextInternalError(error: unknown): boolean {
  return ((error as { digest?: string })?.digest ?? '').startsWith('NEXT_')
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return { supabase, user: session.user }
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  try {
    const { supabase, user } = await requireUser()
    const raw = (formData.get('company_name') as string | null) ?? ''
    const company_name = raw.trim()

    if (company_name.length > MAX_COMPANY_NAME_LEN) {
      return { fieldErrors: { company_name: `Must be ${MAX_COMPANY_NAME_LEN} characters or fewer.` } }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ company_name: company_name || null })
      .eq('id', user.id)

    if (error) return { error: error.message }
    return { message: 'Profile updated.' }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function updateEmail(
  _prev: EmailActionState,
  formData: FormData
): Promise<EmailActionState> {
  try {
    const { supabase, user } = await requireUser()
    const newEmail = ((formData.get('email') as string | null) ?? '').trim()

    if (!newEmail) {
      return { fieldErrors: { email: 'Email is required.' } }
    }
    if (!isValidEmail(newEmail)) {
      return { fieldErrors: { email: 'Please enter a valid email address.' } }
    }
    if (newEmail.toLowerCase() === (user.email ?? '').toLowerCase()) {
      return { fieldErrors: { email: 'That is already your email.' } }
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) return { error: error.message }

    return { message: 'Confirmation links were sent to your current and new email addresses. Both must be confirmed to complete the change.' }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function updatePassword(
  _prev: PasswordActionState,
  formData: FormData
): Promise<PasswordActionState> {
  try {
    const { supabase, user } = await requireUser()
    const currentPassword = (formData.get('current_password') as string | null) ?? ''
    const newPassword = (formData.get('new_password') as string | null) ?? ''
    const confirmPassword = (formData.get('confirm_password') as string | null) ?? ''

    const fieldErrors: PasswordFieldErrors = {}
    if (!currentPassword) fieldErrors.current_password = 'Current password is required.'
    if (!newPassword) fieldErrors.new_password = 'New password is required.'
    else if (newPassword.length < MIN_PASSWORD_LEN) {
      fieldErrors.new_password = `Password must be at least ${MIN_PASSWORD_LEN} characters.`
    }
    if (newPassword && confirmPassword !== newPassword) {
      fieldErrors.confirm_password = 'Passwords do not match.'
    }
    if (newPassword && currentPassword && newPassword === currentPassword) {
      fieldErrors.new_password = 'New password must be different from the current password.'
    }
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

    if (!user.email) {
      return { error: 'No email on account — cannot verify current password.' }
    }

    // Verify the current password by signing in again. signInWithPassword does not invalidate
    // the existing session — it just authenticates against the credentials.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verifyError) {
      return { fieldErrors: { current_password: 'Current password is incorrect.' } }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) return { error: updateError.message }

    return { message: 'Password updated.' }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function deleteAccount(): Promise<{ error: string } | void> {
  let didDelete = false
  try {
    const { supabase, user } = await requireUser()
    const admin = createAdminClient()
    if (!admin) {
      return { error: 'Account deletion is not configured. Please contact support.' }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return { error: error.message }

    didDelete = true
    // Best-effort sign out so the cookie is cleared on this device.
    try { await supabase.auth.signOut() } catch { /* user already gone */ }
  } catch (error) {
    if (isNextInternalError(error)) throw error
    Sentry.captureException(error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
  if (didDelete) redirect('/login')
}
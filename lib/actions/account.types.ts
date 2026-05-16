export type ProfileFieldErrors = {
  company_name?: string
}

export type EmailFieldErrors = {
  email?: string
}

export type PasswordFieldErrors = {
  current_password?: string
  new_password?: string
  confirm_password?: string
}

export type AccountActionState<F = Record<string, string>> = {
  error?: string
  message?: string
  fieldErrors?: F
} | undefined

export type ProfileActionState = AccountActionState<ProfileFieldErrors>
export type EmailActionState = AccountActionState<EmailFieldErrors>
export type PasswordActionState = AccountActionState<PasswordFieldErrors>
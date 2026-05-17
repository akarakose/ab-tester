export type FolderFieldErrors = {
  name?: string
  parent_id?: string
}

export type FolderActionState = {
  error?: string
  message?: string
  fieldErrors?: FolderFieldErrors
  createdId?: string
} | undefined
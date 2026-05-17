export type Folder = {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  created_at: string
  updated_at: string
}

export type FolderNode = Folder & {
  children: FolderNode[]
}

export type FolderBreadcrumb = {
  id: string
  name: string
}
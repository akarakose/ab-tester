import type { FolderNode } from '@/types/folder'
import FolderCard from './FolderCard'

export default function SubFolderGrid({
  folders,
  archived = false,
}: {
  folders: FolderNode[]
  archived?: boolean
}) {
  if (folders.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {folders.map(f => <FolderCard key={f.id} folder={f} archived={archived} />)}
    </div>
  )
}
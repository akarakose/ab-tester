'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Folder } from '@/types/folder'
import { renameFolder, deleteFolder } from '@/lib/actions/folders'
import Spinner from '@/components/ui/Spinner'

type Mode = 'view' | 'rename' | 'confirm-delete'

export default function FolderActions({ folder }: { folder: Folder }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('view')
  const [name, setName] = useState(folder.name)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const startRename = () => {
    setName(folder.name)
    setError(null)
    setMode('rename')
  }

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === folder.name) {
      setMode('view')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await renameFolder(folder.id, trimmed)
      if (result.error) { setError(result.error); return }
      setMode('view')
      router.refresh()
    })
  }

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteFolder(folder.id)
      // On success, the action redirects — we only see a result on error.
      if (result?.error) setError(result.error)
    })
  }

  if (mode === 'rename') {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-1.5">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          maxLength={100}
          disabled={pending}
          className="border border-foreground/15 rounded-lg px-3 py-1.5 bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="text-sm font-medium text-brand hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
        >
          {pending && <Spinner />}
          Save
        </button>
        <button
          type="button"
          onClick={() => { setMode('view'); setError(null) }}
          disabled={pending}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
      </form>
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground/70">
          Delete this folder? Sub-folders are deleted; experiments become unfiled.
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {pending && <Spinner />}
          {pending ? 'Deleting...' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setMode('view')}
          disabled={pending}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={startRename}
        className="text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={() => setMode('confirm-delete')}
        className="text-sm text-red-500 hover:text-red-600 transition-colors"
      >
        Delete
      </button>
    </div>
  )
}
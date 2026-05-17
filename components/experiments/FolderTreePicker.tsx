'use client'

import { useState, useTransition } from 'react'
import type { FolderNode } from '@/types/folder'
import Spinner from '@/components/ui/Spinner'

type Props = {
  folders: FolderNode[]
  pending: boolean
  // Disable a folder id (e.g. the current folder, so users can't move into it).
  disabledIds?: Set<string>
  onPick: (folderId: string | null) => void
  onCreateAndPick: (name: string, parentId: string | null) => Promise<{ error?: string }>
}

type Flat = { node: FolderNode; depth: number }

function flatten(roots: FolderNode[], depth = 0, out: Flat[] = []): Flat[] {
  for (const root of roots) {
    out.push({ node: root, depth })
    if (root.children.length > 0) flatten(root.children, depth + 1, out)
  }
  return out
}

export default function FolderTreePicker({
  folders,
  pending,
  disabledIds,
  onPick,
  onCreateAndPick,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, startCreate] = useTransition()

  const flat = flatten(folders)
  const disabled = pending || isCreating

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreateError(null)
    startCreate(async () => {
      const result = await onCreateAndPick(trimmed, null)
      if (result.error) {
        setCreateError(result.error)
        return
      }
      setNewName('')
      setCreating(false)
    })
  }

  return (
    <div className="w-64 max-h-80 flex flex-col">
      <div className="px-3 pt-3 pb-1.5 text-xs font-medium text-foreground/50 uppercase tracking-wide">
        Move to
      </div>
      <div className="overflow-y-auto flex-1">
        <button
          type="button"
          onClick={() => onPick(null)}
          disabled={disabled}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-foreground/5 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-foreground/40" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <span className="text-foreground/70">Unfiled (no folder)</span>
        </button>
        {flat.length === 0 ? (
          <p className="px-3 py-2 text-xs text-foreground/40">No folders yet.</p>
        ) : (
          flat.map(({ node, depth }) => {
            const isDisabled = disabled || disabledIds?.has(node.id)
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onPick(node.id)}
                disabled={isDisabled}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-foreground/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                style={{ paddingLeft: `${12 + depth * 14}px` }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-brand/60 shrink-0" aria-hidden="true">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                </svg>
                <span className="truncate">{node.name}</span>
              </button>
            )
          })
        )}
      </div>
      <div className="border-t border-foreground/10 p-2">
        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Folder name"
                autoFocus
                maxLength={100}
                disabled={isCreating}
                className="flex-1 min-w-0 border border-foreground/15 rounded px-2 py-1 bg-background text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isCreating || !newName.trim()}
                className="text-xs font-medium text-brand hover:opacity-80 disabled:opacity-40 transition-opacity flex items-center gap-1 px-1.5"
              >
                {isCreating && <Spinner />}
                Create
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName(''); setCreateError(null) }}
                disabled={isCreating}
                className="text-xs text-foreground/50 hover:text-foreground transition-colors px-1.5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={disabled}
            className="w-full text-left text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 disabled:opacity-50 rounded px-2 py-1 transition-colors flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New folder
          </button>
        )}
      </div>
    </div>
  )
}
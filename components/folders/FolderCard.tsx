'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FolderNode } from '@/types/folder'
import { moveFolder } from '@/lib/actions/folders'
import { bulkMoveExperimentsToFolder } from '@/lib/actions/experiments'

const DRAG_MIME = 'application/x-ab-drag'

type Payload =
  | { type: 'experiments'; ids: string[] }
  | { type: 'folder'; id: string }

function readPayload(e: React.DragEvent): Payload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.type === 'experiments' && Array.isArray(parsed.ids)) return parsed
    if (parsed?.type === 'folder' && typeof parsed.id === 'string') return parsed
    return null
  } catch {
    return null
  }
}

export default function FolderCard({
  folder,
  archived = false,
}: {
  folder: FolderNode
  archived?: boolean
}) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const href = `/dashboard/experiments?folder=${folder.id}${archived ? '&archived=1' : ''}`

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ type: 'folder', id: folder.id }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOver) setDragOver(true)
  }

  const onDragLeave = () => setDragOver(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const payload = readPayload(e)
    if (!payload) return
    if (payload.type === 'folder' && payload.id === folder.id) return
    setError(null)
    startTransition(async () => {
      const result = payload.type === 'experiments'
        ? await bulkMoveExperimentsToFolder(payload.ids, folder.id)
        : await moveFolder(payload.id, folder.id)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <Link
        href={href}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-busy={pending}
        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
          dragOver
            ? 'border-brand bg-brand/10 ring-2 ring-brand/30'
            : 'border-foreground/10 hover:border-brand/40 hover:bg-foreground/[0.02]'
        } ${pending ? 'opacity-60' : ''}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-brand/70 shrink-0 group-hover:text-brand transition-colors" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        </svg>
        <span className="text-sm font-medium truncate flex-1 min-w-0">{folder.name}</span>
        {folder.children.length > 0 && (
          <span className="text-xs text-foreground/40 tabular-nums shrink-0">
            {folder.children.length}
          </span>
        )}
      </Link>
      {error && (
        <p
          className="absolute left-0 right-0 -bottom-5 text-xs text-red-500 truncate px-1"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
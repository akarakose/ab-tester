'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FolderBreadcrumb } from '@/types/folder'
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

function DropCrumb({
  href,
  targetFolderId,
  children,
  emphasized,
}: {
  href: string
  // null = root (unfiled / no parent); string = folder id
  targetFolderId: string | null
  children: React.ReactNode
  emphasized?: boolean
}) {
  const router = useRouter()
  const [hover, setHover] = useState(false)
  const [pending, startTransition] = useTransition()

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!hover) setHover(true)
  }
  const onDragLeave = () => setHover(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setHover(false)
    const payload = readPayload(e)
    if (!payload) return
    if (payload.type === 'folder' && payload.id === targetFolderId) return
    startTransition(async () => {
      if (payload.type === 'experiments') {
        await bulkMoveExperimentsToFolder(payload.ids, targetFolderId)
      } else {
        await moveFolder(payload.id, targetFolderId)
      }
      router.refresh()
    })
  }

  return (
    <Link
      href={href}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`transition-colors rounded px-1 -mx-1 ${
        hover ? 'bg-brand/20 text-foreground' : emphasized ? 'text-foreground/80 hover:text-foreground' : 'hover:text-foreground'
      } ${pending ? 'opacity-60' : ''}`}
    >
      {children}
    </Link>
  )
}

export default function Breadcrumbs({
  trail,
  archived = false,
}: {
  trail: FolderBreadcrumb[]
  archived?: boolean
}) {
  const suffix = archived ? '&archived=1' : ''
  const rootHref = archived ? '/dashboard/experiments?archived=1' : '/dashboard/experiments'
  return (
    <nav aria-label="Folder breadcrumb" className="text-sm text-foreground/60 flex items-center flex-wrap gap-1">
      <DropCrumb href={rootHref} targetFolderId={null} emphasized>
        Experiments
      </DropCrumb>
      {trail.map((node, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={node.id} className="flex items-center gap-1">
            <span className="text-foreground/30">/</span>
            {isLast ? (
              <span className="text-foreground font-medium px-1 -mx-1">{node.name}</span>
            ) : (
              <DropCrumb href={`/dashboard/experiments?folder=${node.id}${suffix}`} targetFolderId={node.id}>
                {node.name}
              </DropCrumb>
            )}
          </span>
        )
      })}
    </nav>
  )
}
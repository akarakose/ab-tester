'use client'

import { useState, useTransition } from 'react'
import { createFolder } from '@/lib/actions/folders'
import Spinner from '@/components/ui/Spinner'

export default function NewFolderForm({ parentId }: { parentId: string | null }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', trimmed)
      if (parentId) fd.set('parent_id', parentId)
      const result = await createFolder(undefined, fd)
      if (result?.error) { setError(result.error); return }
      if (result?.fieldErrors?.name) { setError(result.fieldErrors.name); return }
      setName('')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors rounded-lg px-3 py-1.5 border border-foreground/15 hover:border-foreground/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New folder
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Folder name"
          autoFocus
          maxLength={100}
          disabled={pending}
          className="border border-foreground/15 rounded-lg px-3 py-1.5 bg-background text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="bg-brand text-brand-foreground rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
        >
          {pending && <Spinner />}
          Create
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setName(''); setError(null) }}
          disabled={pending}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors px-2 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  )
}
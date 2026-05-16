'use client'

import { useState } from 'react'
import { archiveExperiment, permanentlyDeleteExperiment } from '@/lib/actions/experiments'
import Spinner from '@/components/ui/Spinner'

type Mode = 'idle' | 'confirm-archive' | 'confirm-delete'

export default function ActiveActions({ id }: { id: string }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [pendingAction, setPendingAction] = useState<'archive' | 'delete' | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleArchive() {
    setError(null)
    setPendingAction('archive')
    const result = await archiveExperiment(id)
    if (result?.error) {
      setError(result.error)
      setMode('idle')
      setPendingAction(null)
    }
  }

  async function handlePermanentDelete() {
    setError(null)
    setPendingAction('delete')
    const result = await permanentlyDeleteExperiment(id, false)
    if (result?.error) {
      setError(result.error)
      setMode('idle')
      setPendingAction(null)
      setConfirmInput('')
    }
  }

  const pending = pendingAction !== null

  if (mode === 'confirm-archive') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground/50">Archive this experiment?</span>
        <button
          onClick={handleArchive}
          disabled={pending}
          className="text-sm text-foreground hover:text-foreground/80 font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {pendingAction === 'archive' && <Spinner />}
          {pendingAction === 'archive' ? 'Archiving...' : 'Yes, archive'}
        </button>
        <button
          onClick={() => setMode('idle')}
          disabled={pending}
          className="text-sm text-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <div className="flex flex-col items-end gap-2 max-w-xs">
        <p className="text-xs text-foreground/70 text-right">
          Type <span className="font-mono font-semibold text-red-500">DELETE</span> to permanently remove this experiment. This cannot be undone.
        </p>
        <input
          type="text"
          value={confirmInput}
          onChange={e => setConfirmInput(e.target.value)}
          autoFocus
          className="border border-foreground/15 rounded-lg px-2.5 py-1.5 bg-background text-sm outline-none focus:ring-2 focus:ring-red-500 w-40 text-right"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handlePermanentDelete}
            disabled={pending || confirmInput !== 'DELETE'}
            className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {pendingAction === 'delete' && <Spinner />}
            {pendingAction === 'delete' ? 'Deleting...' : 'Permanently delete'}
          </button>
          <button
            onClick={() => { setMode('idle'); setConfirmInput('') }}
            disabled={pending}
            className="text-sm text-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMode('confirm-archive')}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          Archive
        </button>
        <button
          onClick={() => setMode('confirm-delete')}
          className="text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          Delete forever
        </button>
      </div>
    </div>
  )
}
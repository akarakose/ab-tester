'use client'

import { useState } from 'react'
import { restoreExperiment, permanentlyDeleteExperiment } from '@/lib/actions/experiments'
import Spinner from '@/components/ui/Spinner'

export default function ArchivedActions({ id }: { id: string }) {
  const [pendingAction, setPendingAction] = useState<'restore' | 'delete' | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleRestore() {
    setError(null)
    setPendingAction('restore')
    const result = await restoreExperiment(id)
    if (result?.error) {
      setError(result.error)
      setPendingAction(null)
    }
  }

  async function handlePermanentDelete() {
    setError(null)
    setPendingAction('delete')
    const result = await permanentlyDeleteExperiment(id, true)
    if (result?.error) {
      setError(result.error)
      setPendingAction(null)
      setConfirming(false)
    }
  }

  const pending = pendingAction !== null

  if (confirming) {
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
            onClick={() => { setConfirming(false); setConfirmInput('') }}
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
          onClick={handleRestore}
          disabled={pending}
          className="text-sm font-medium text-brand hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
        >
          {pendingAction === 'restore' && <Spinner />}
          {pendingAction === 'restore' ? 'Restoring...' : 'Restore'}
        </button>
        <button
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          Delete forever
        </button>
      </div>
    </div>
  )
}
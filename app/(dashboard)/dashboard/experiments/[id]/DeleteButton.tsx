'use client'

import { useState } from 'react'
import { deleteExperiment } from '@/lib/actions/experiments'

export default function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setPending(true)
    const result = await deleteExperiment(id)
    if (result?.error) {
      setError(result.error)
      setConfirming(false)
      setPending(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground/50">Are you sure?</span>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-50 transition-colors"
        >
          {pending ? 'Deleting...' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-foreground/40 hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 hover:text-red-600 transition-colors"
      >
        Delete
      </button>
    </div>
  )
}
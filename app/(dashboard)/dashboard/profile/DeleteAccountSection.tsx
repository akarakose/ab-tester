'use client'

import { useState } from 'react'
import { deleteAccount } from '@/lib/actions/account'
import Spinner from '@/components/ui/Spinner'

const CONFIRM_PHRASE = 'DELETE'

export default function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setPending(true)
    setError(null)
    const result = await deleteAccount()
    // Successful deletes redirect — we only land here on error.
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-start gap-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium border border-red-500/40 text-red-500 hover:bg-red-500/10 transition-colors"
        >
          Delete account
        </button>
      </div>
    )
  }

  const canConfirm = phrase === CONFIRM_PHRASE && !pending

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm. Your account and all experiments will be permanently removed.
      </p>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        autoFocus
        className="border border-foreground/15 rounded-lg px-3 py-2 bg-background text-foreground text-sm outline-none transition-all hover:border-foreground/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={!canConfirm}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {pending && <Spinner />}
          {pending ? 'Deleting...' : 'Delete my account'}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setPhrase(''); setError(null) }}
          disabled={pending}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

const inputClass = 'border border-foreground/15 rounded-lg px-2.5 py-1.5 bg-background text-sm outline-none focus:ring-2 focus:ring-brand w-full'

export default function FilterControls({ activeCount, rightSlot }: { activeCount: number; rightSlot?: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(activeCount > 0)
  const [nameInput, setNameInput] = useState(searchParams.get('q') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      nameInput ? params.set('q', nameInput) : params.delete('q')
      router.push(`?${params.toString()}`)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [nameInput])

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    value ? params.set(key, value) : params.delete(key)
    router.push(`?${params.toString()}`)
  }

  const clearAll = () => {
    setNameInput('')
    const params = new URLSearchParams(searchParams.toString())
    ;['q', 'status', 'created_from', 'created_to', 'updated_from', 'updated_to'].forEach(k => params.delete(k))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(o => !o)}
            className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors ${open ? 'border-brand text-brand bg-brand/5' : 'border-foreground/15 hover:bg-foreground/5'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className="bg-brand text-brand-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeCount}
              </span>
            )}
          </button>
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-sm text-foreground/50 hover:text-foreground transition-colors">
              Clear all
            </button>
          )}
        </div>
        {rightSlot}
      </div>

      {open && (
        <div className="mt-3 border border-foreground/10 rounded-xl p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/50 font-medium">Name</label>
              <input
                type="text"
                placeholder="Search experiments..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/50 font-medium">Status</label>
              <select
                value={searchParams.get('status') ?? ''}
                onChange={e => updateParam('status', e.target.value)}
                className={inputClass}
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="running">Running</option>
                <option value="concluded">Concluded</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/50 font-medium">Created</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={searchParams.get('created_from') ?? ''}
                  onChange={e => updateParam('created_from', e.target.value)}
                  className={inputClass}
                />
                <span className="text-xs text-foreground/40 shrink-0">to</span>
                <input
                  type="date"
                  value={searchParams.get('created_to') ?? ''}
                  onChange={e => updateParam('created_to', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/50 font-medium">Last updated</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={searchParams.get('updated_from') ?? ''}
                  onChange={e => updateParam('updated_from', e.target.value)}
                  className={inputClass}
                />
                <span className="text-xs text-foreground/40 shrink-0">to</span>
                <input
                  type="date"
                  value={searchParams.get('updated_to') ?? ''}
                  onChange={e => updateParam('updated_to', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
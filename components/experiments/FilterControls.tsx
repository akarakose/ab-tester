'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

const fieldClass = 'border border-foreground/15 rounded-lg px-2.5 py-1.5 bg-background text-sm outline-none focus:ring-2 focus:ring-brand w-full'

export default function FilterControls({ rightSlot }: { rightSlot?: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)

  const advancedFilterCount = [
    searchParams.get('status'),
    searchParams.get('created_from'),
    searchParams.get('created_to'),
    searchParams.get('updated_from'),
    searchParams.get('updated_to'),
  ].filter(Boolean).length

  const [open, setOpen] = useState(advancedFilterCount > 0)
  const [nameInput, setNameInput] = useState(searchParams.get('q') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (nameInput) { params.set('q', nameInput) } else { params.delete('q') }
      router.push(`?${params.toString()}`)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [nameInput, router, searchParams])

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set(key, value) } else { params.delete(key) }
    router.push(`?${params.toString()}`)
  }

  const clearAll = () => {
    setNameInput('')
    setOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    const filterKeys = ['q', 'status', 'created_from', 'created_to', 'updated_from', 'updated_to']
    filterKeys.forEach(k => params.delete(k))
    router.push(`?${params.toString()}`)
  }

  const hasAnyFilter = !!nameInput || advancedFilterCount > 0

  return (
    <div className="mb-4 flex items-center gap-3">
      {/* Search bar — relative anchor for the floating panel */}
      <div ref={containerRef} className="relative flex-1">
        {/* Search bar */}
        <div className="flex items-center h-9 border border-foreground/15 rounded-lg bg-background focus-within:ring-2 focus-within:ring-brand transition-shadow overflow-hidden">
          <svg className="ml-3 shrink-0 w-4 h-4 text-foreground/35 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>

          <input
            type="text"
            placeholder="Search experiments..."
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            className="flex-1 h-full px-2.5 text-sm bg-transparent outline-none placeholder:text-foreground/35"
          />

          <div className="shrink-0 w-px h-5 bg-foreground/12" />

          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            title="Advanced filters"
            className={`relative flex items-center justify-center w-10 h-full shrink-0 transition-colors ${
              open || advancedFilterCount > 0 ? 'text-brand' : 'text-foreground/40 hover:text-foreground/70'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M9 16h6" />
            </svg>
            {advancedFilterCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-brand text-brand-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                {advancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Floating filter panel */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-20 rounded-xl border border-foreground/15 shadow-xl shadow-foreground/10 p-4 flex flex-col gap-3"
            style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 5%, var(--background))' }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-foreground/50 font-medium">Status</label>
                <select
                  value={searchParams.get('status') ?? ''}
                  onChange={e => updateParam('status', e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="running">Running</option>
                  <option value="concluded">Concluded</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-foreground/50 font-medium">Created</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    defaultValue={searchParams.get('created_from') ?? ''}
                    onChange={e => updateParam('created_from', e.target.value)}
                    className={fieldClass}
                  />
                  <span className="text-xs text-foreground/35 shrink-0">–</span>
                  <input
                    type="date"
                    defaultValue={searchParams.get('created_to') ?? ''}
                    onChange={e => updateParam('created_to', e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-foreground/50 font-medium">Last updated</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    defaultValue={searchParams.get('updated_from') ?? ''}
                    onChange={e => updateParam('updated_from', e.target.value)}
                    className={fieldClass}
                  />
                  <span className="text-xs text-foreground/35 shrink-0">–</span>
                  <input
                    type="date"
                    defaultValue={searchParams.get('updated_to') ?? ''}
                    onChange={e => updateParam('updated_to', e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            {hasAnyFilter && (
              <div className="flex justify-end pt-1 border-t border-foreground/10">
                <button
                  onClick={clearAll}
                  className="text-xs text-foreground/45 hover:text-foreground transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sort controls */}
      {rightSlot}
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'

export type MetricOption = { id: number; label: string; checked: boolean }

export default function MetricMultiSelect({
  options,
  onToggle,
  onSelectAll,
  onDeselectAll,
  placeholder = 'No metrics',
}: {
  options: MetricOption[]
  onToggle: (id: number, checked: boolean) => void
  onSelectAll: (visibleIds: number[]) => void
  onDeselectAll: (visibleIds: number[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const total = options.length
  const checkedCount = options.filter(o => o.checked).length
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
  const visibleIds = filtered.map(o => o.id)

  let summary: string
  if (total === 0) summary = placeholder
  else if (checkedCount === 0) summary = `0 of ${total} metrics`
  else if (checkedCount === total) summary = `All ${total} metrics`
  else summary = `${checkedCount} of ${total} metrics`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-xs px-3 py-1.5 rounded-md border border-foreground/15 bg-background hover:border-foreground/35 transition-colors flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{summary}</span>
        <svg className="w-3 h-3 shrink-0 opacity-50" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
          <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute z-10 top-full left-0 right-0 mt-1 border border-foreground/15 rounded-md bg-background shadow-md flex flex-col"
          style={{ maxHeight: '20rem' }}
        >
          <div className="p-2 border-b border-foreground/10">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search metrics…"
              autoFocus
              className="w-full text-xs px-2 py-1.5 border border-foreground/15 rounded outline-none focus:border-foreground/35 bg-background"
            />
          </div>
          <div className="px-2 py-1 border-b border-foreground/10 flex gap-3">
            <button
              type="button"
              onClick={() => onSelectAll(visibleIds)}
              className="text-[11px] text-brand hover:opacity-75 transition-opacity"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onDeselectAll(visibleIds)}
              className="text-[11px] text-foreground/60 hover:text-foreground transition-colors"
            >
              Deselect all
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-foreground/40 px-3 py-2">No metrics match.</p>
            ) : (
              filtered.map(o => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-foreground/[0.04] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={o.checked}
                    onChange={e => onToggle(o.id, e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span className="truncate">{o.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
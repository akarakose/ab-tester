'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import type { SortField, SortOrder } from '@/lib/actions/experiments'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'created_at', label: 'Date created' },
  { value: 'updated_at', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
]

export default function SortControls({
  sortBy,
  sortOrder,
}: {
  sortBy: SortField
  sortOrder: SortOrder
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const update = (field: SortField, order: SortOrder) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', field)
    params.set('order', order)
    startTransition(() => router.push(`?${params.toString()}`))
  }

  const toggleOrder = () => {
    update(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className={`flex items-center gap-2 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      <span className="text-sm text-foreground/50">Sort</span>
      <select
        value={sortBy}
        onChange={e => update(e.target.value as SortField, sortOrder)}
        disabled={isPending}
        className="text-sm border border-foreground/15 rounded-lg px-2 py-1.5 bg-background outline-none focus:ring-2 focus:ring-brand cursor-pointer disabled:cursor-wait"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={toggleOrder}
        disabled={isPending}
        className="text-sm border border-foreground/15 rounded-lg px-2 py-1.5 bg-background hover:bg-foreground/5 transition-colors min-w-[40px] text-center disabled:cursor-wait"
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortOrder === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  )
}
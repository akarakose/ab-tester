'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export type ExperimentView = 'detail' | 'tile' | 'list'

const OPTIONS: { value: ExperimentView; label: string; icon: React.ReactNode }[] = [
  {
    value: 'list',
    label: 'List view',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    value: 'tile',
    label: 'Tile view',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z" />
      </svg>
    ),
  },
  {
    value: 'detail',
    label: 'Detail view',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="16" height="6" rx="1.5" strokeLinejoin="round" />
        <rect x="4" y="14" width="16" height="6" rx="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function ViewToggle({ view }: { view: ExperimentView }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const select = (next: ExperimentView) => {
    if (next === view) return
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'detail') params.delete('view')
    else params.set('view', next)
    startTransition(() => router.push(`?${params.toString()}`))
  }

  return (
    <div
      role="group"
      aria-label="View options"
      className={`flex items-center border border-foreground/15 rounded-lg overflow-hidden bg-background transition-opacity ${isPending ? 'opacity-60' : ''}`}
    >
      {OPTIONS.map(opt => {
        const active = opt.value === view
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            disabled={isPending}
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
            className={`px-2.5 py-1.5 transition-colors disabled:cursor-wait ${
              active
                ? 'bg-brand/10 text-brand'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {opt.icon}
          </button>
        )
      })}
    </div>
  )
}
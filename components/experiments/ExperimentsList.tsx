'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import type { Experiment } from '@/types/experiment'
import type { SortField, SortOrder } from '@/lib/actions/experiments.types'
import {
  bulkArchiveExperiments,
  bulkRestoreExperiments,
  bulkPermanentlyDeleteExperiments,
} from '@/lib/actions/experiments'
import ExperimentCard from './ExperimentCard'
import ExperimentTile from './ExperimentTile'
import ExperimentListRow from './ExperimentListRow'
import FilterControls from './FilterControls'
import ViewToggle, { type ExperimentView } from './ViewToggle'
import SortControls from './SortControls'
import Spinner from '@/components/ui/Spinner'

type Props = {
  experiments: Experiment[]
  view: ExperimentView
  sortBy: SortField
  sortOrder: SortOrder
  archived: boolean
}

type Mode = 'browse' | 'confirm-archive' | 'confirm-restore' | 'confirm-delete'

export default function ExperimentsList({ experiments, view, sortBy, sortOrder, archived }: Props) {
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('browse')
  const [confirmInput, setConfirmInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const ids = Array.from(selected)
  const count = ids.length
  const allSelected = count > 0 && count === experiments.length

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setMode('browse')
    setConfirmInput('')
    setError(null)
  }

  // Switching between Active and Archived tabs invalidates any in-flight selection
  // (those IDs only exist in the previous tab), so drop the selection wholesale.
  useEffect(() => {
    exitSelectMode()
  }, [archived])

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(experiments.map(e => e.id)))
  }

  const runBulk = (action: () => Promise<{ error?: string; count?: number }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      exitSelectMode()
    })
  }

  const handleArchive = () => runBulk(() => bulkArchiveExperiments(ids))
  const handleRestore = () => runBulk(() => bulkRestoreExperiments(ids))
  const handlePermanentDelete = () => runBulk(() => bulkPermanentlyDeleteExperiments(ids))

  const selectToggle = experiments.length > 0 ? (
    <button
      type="button"
      onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
      className={`text-sm rounded-lg px-3 py-1.5 border transition-colors whitespace-nowrap ${
        selectMode
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-foreground/15 text-foreground/70 hover:text-foreground hover:border-foreground/30'
      }`}
    >
      {selectMode ? 'Cancel' : 'Select'}
    </button>
  ) : null

  const controlsBar = (
    <Suspense fallback={null}>
      <FilterControls
        rightSlot={
          <div className="flex items-center gap-2 flex-wrap">
            <SortControls sortBy={sortBy} sortOrder={sortOrder} />
            <ViewToggle view={view} />
            {selectToggle}
          </div>
        }
      />
    </Suspense>
  )

  const actionBar = selectMode && experiments.length > 0 && (
    <div className="mb-3">
      <div className="rounded-xl border border-foreground/15 bg-foreground/[0.02] px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-medium">
          {count === 0 ? 'Tap experiments to select' : `${count} selected`}
        </span>
        <button
          type="button"
          onClick={toggleAll}
          disabled={isPending}
          className="text-xs text-foreground/60 hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {allSelected ? 'Deselect all' : `Select all (${experiments.length})`}
        </button>

        {mode === 'browse' && count > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            {archived ? (
              <button
                type="button"
                onClick={() => setMode('confirm-restore')}
                disabled={isPending}
                className="text-sm font-medium text-brand hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                Restore
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('confirm-archive')}
                disabled={isPending}
                className="text-sm text-foreground hover:text-foreground/80 disabled:opacity-50 transition-colors"
              >
                Archive
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('confirm-delete')}
              disabled={isPending}
              className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
            >
              Delete forever
            </button>
          </div>
        )}

        {mode === 'confirm-archive' && (
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <span className="text-sm text-foreground/70">Archive {count} experiment{count === 1 ? '' : 's'}?</span>
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="text-sm text-foreground hover:text-foreground/80 font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isPending && <Spinner />}
              {isPending ? 'Archiving...' : 'Yes, archive'}
            </button>
            <button
              type="button"
              onClick={() => setMode('browse')}
              disabled={isPending}
              className="text-sm text-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {mode === 'confirm-restore' && (
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <span className="text-sm text-foreground/70">Restore {count} experiment{count === 1 ? '' : 's'}?</span>
            <button
              type="button"
              onClick={handleRestore}
              disabled={isPending}
              className="text-sm font-medium text-brand hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
            >
              {isPending && <Spinner />}
              {isPending ? 'Restoring...' : 'Yes, restore'}
            </button>
            <button
              type="button"
              onClick={() => setMode('browse')}
              disabled={isPending}
              className="text-sm text-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        {mode === 'confirm-delete' && (
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <span className="text-sm text-foreground/70">
              Type <span className="font-mono font-semibold text-red-500">DELETE</span> to permanently remove {count} experiment{count === 1 ? '' : 's'}.
            </span>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              autoFocus
              className="border border-foreground/15 rounded-lg px-2.5 py-1 bg-background text-sm outline-none focus:ring-2 focus:ring-red-500 w-32"
            />
            <button
              type="button"
              onClick={handlePermanentDelete}
              disabled={isPending || confirmInput !== 'DELETE'}
              className="text-sm text-red-500 hover:text-red-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {isPending && <Spinner />}
              {isPending ? 'Deleting...' : 'Permanently delete'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('browse'); setConfirmInput('') }}
              disabled={isPending}
              className="text-sm text-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 px-1">{error}</p>}
    </div>
  )

  // In select mode, the inner card's <Link> must not navigate — we make it
  // non-interactive and handle the click on the outer wrapper instead.
  function ItemWrap({ id, name, children }: { id: string; name: string; children: React.ReactNode }) {
    const isSelected = selected.has(id)
    if (!selectMode) return <>{children}</>
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`Select ${name}`}
        onClick={() => toggleOne(id)}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            toggleOne(id)
          }
        }}
        className={`relative cursor-pointer rounded-xl transition-all ${
          isSelected ? 'ring-2 ring-brand' : 'ring-2 ring-transparent hover:ring-foreground/15'
        }`}
      >
        <div className="pointer-events-none">{children}</div>
      </div>
    )
  }

  if (experiments.length === 0) {
    return (
      <>
        {controlsBar}
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-foreground/20 rounded-xl text-center px-6">
          <p className="font-semibold text-foreground">No results</p>
          <p className="text-sm text-foreground/50 mt-1">No experiments match your current filters.</p>
        </div>
      </>
    )
  }

  if (view === 'list') {
    return (
      <>
        {controlsBar}
        {actionBar}
        <div className="border border-foreground/10 rounded-xl divide-y divide-foreground/8 overflow-hidden">
          {experiments.map(exp => {
            if (!selectMode) {
              return <ExperimentListRow key={exp.id} experiment={exp} />
            }
            const isSelected = selected.has(exp.id)
            return (
              <div
                key={exp.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Select ${exp.name}`}
                onClick={() => toggleOne(exp.id)}
                onKeyDown={e => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    toggleOne(exp.id)
                  }
                }}
                className={`relative cursor-pointer transition-colors ${
                  isSelected ? 'bg-brand/10' : 'hover:bg-foreground/[0.02]'
                }`}
              >
                <div className="pointer-events-none">
                  <ExperimentListRow experiment={exp} />
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  if (view === 'tile') {
    return (
      <>
        {controlsBar}
        {actionBar}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {experiments.map(exp => (
            <ItemWrap key={exp.id} id={exp.id} name={exp.name}>
              <ExperimentTile experiment={exp} />
            </ItemWrap>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {controlsBar}
      {actionBar}
      <div className="flex flex-col gap-3">
        {experiments.map(exp => (
          <ItemWrap key={exp.id} id={exp.id} name={exp.name}>
            <ExperimentCard experiment={exp} />
          </ItemWrap>
        ))}
      </div>
    </>
  )
}
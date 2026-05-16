import type { Metadata } from 'next'
import { getExperiments } from '@/lib/actions/experiments'
import type { SortField, SortOrder, ExperimentFilters } from '@/lib/actions/experiments.types'
import Link from 'next/link'
import { Suspense } from 'react'
import ExperimentCard from '@/components/experiments/ExperimentCard'
import ExperimentTile from '@/components/experiments/ExperimentTile'
import ExperimentListRow from '@/components/experiments/ExperimentListRow'
import SortControls from '@/components/experiments/SortControls'
import FilterControls from '@/components/experiments/FilterControls'
import ViewToggle, { type ExperimentView } from '@/components/experiments/ViewToggle'

export const metadata: Metadata = {
  title: 'Experiments',
}

const VALID_SORT_FIELDS: SortField[] = ['name', 'created_at', 'updated_at', 'status']
const VALID_SORT_ORDERS: SortOrder[] = ['asc', 'desc']
const VALID_VIEWS: ExperimentView[] = ['detail', 'tile', 'list']

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const archived = params.archived === '1'

  const sortBy: SortField = VALID_SORT_FIELDS.includes(params.sort as SortField)
    ? (params.sort as SortField)
    : 'created_at'
  const sortOrder: SortOrder = VALID_SORT_ORDERS.includes(params.order as SortOrder)
    ? (params.order as SortOrder)
    : 'desc'
  const view: ExperimentView = VALID_VIEWS.includes(params.view as ExperimentView)
    ? (params.view as ExperimentView)
    : 'detail'

  const filters: ExperimentFilters = {
    name: params.q,
    status: params.status,
    createdFrom: params.created_from,
    createdTo: params.created_to,
    updatedFrom: params.updated_from,
    updatedTo: params.updated_to,
    archived,
  }

  const activeFilterCount = [
    filters.name, filters.status, filters.createdFrom, filters.createdTo,
    filters.updatedFrom, filters.updatedTo,
  ].filter(Boolean).length

  const experiments = await getExperiments(sortBy, sortOrder, filters)

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      active
        ? 'border-brand text-foreground'
        : 'border-transparent text-foreground/50 hover:text-foreground/80'
    }`

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Experiments</h1>
        {!archived && (
          <Link
            href="/dashboard/experiments/new"
            className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            New experiment
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-foreground/10 mb-5">
        <Link href="/dashboard/experiments" className={tabClass(!archived)}>
          Active
        </Link>
        <Link href="/dashboard/experiments?archived=1" className={tabClass(archived)}>
          Archived
        </Link>
      </div>

      {experiments.length === 0 && activeFilterCount === 0 ? (
        archived ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-foreground/20 rounded-xl text-center px-6">
            <svg
              className="w-10 h-10 text-foreground/20 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 01-1-1V4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1zM4 7v12a1 1 0 001 1h14a1 1 0 001-1V7M10 11h4" />
            </svg>
            <p className="font-semibold text-foreground">No archived experiments</p>
            <p className="text-sm text-foreground/50 mt-1 max-w-xs">
              Experiments you archive will appear here. You can restore or permanently delete them later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-foreground/20 rounded-xl text-center px-6">
            <svg
              className="w-10 h-10 text-foreground/20 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5V19a1 1 0 001 1h4a1 1 0 001-1v-5.5M3 13.5V9a1 1 0 011-1h4a1 1 0 011 1v4.5M3 13.5h6M10 19V7a1 1 0 011-1h4a1 1 0 011 1v12M10 19h6M17 19v-9a1 1 0 011-1h2a1 1 0 011 1v9M17 19h4" />
            </svg>
            <p className="font-semibold text-foreground">No experiments yet</p>
            <p className="text-sm text-foreground/50 mt-1 mb-6 max-w-xs">
              Create your first A/B test to start measuring what works.
            </p>
            <Link
              href="/dashboard/experiments/new"
              className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Create experiment
            </Link>
          </div>
        )
      ) : (
        <>
          <Suspense fallback={null}>
            <FilterControls
              rightSlot={
                <div className="flex items-center gap-2">
                  <ViewToggle view={view} />
                  <SortControls sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              }
            />
          </Suspense>

          {experiments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-foreground/20 rounded-xl text-center px-6">
              <p className="font-semibold text-foreground">No results</p>
              <p className="text-sm text-foreground/50 mt-1">No experiments match your current filters.</p>
            </div>
          ) : view === 'list' ? (
            <div className="border border-foreground/10 rounded-xl divide-y divide-foreground/8 overflow-hidden">
              {experiments.map(exp => (
                <ExperimentListRow key={exp.id} experiment={exp} />
              ))}
            </div>
          ) : view === 'tile' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {experiments.map(exp => (
                <ExperimentTile key={exp.id} experiment={exp} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {experiments.map(exp => (
                <ExperimentCard key={exp.id} experiment={exp} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
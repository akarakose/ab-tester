import type { Metadata } from 'next'
import { getExperiments } from '@/lib/actions/experiments'
import type { SortField, SortOrder, ExperimentFilters } from '@/lib/actions/experiments'
import Link from 'next/link'
import { Suspense } from 'react'
import ExperimentCard from '@/components/experiments/ExperimentCard'
import SortControls from '@/components/experiments/SortControls'
import FilterControls from '@/components/experiments/FilterControls'

export const metadata: Metadata = {
  title: 'Experiments',
}

const VALID_SORT_FIELDS: SortField[] = ['name', 'created_at', 'updated_at', 'status']
const VALID_SORT_ORDERS: SortOrder[] = ['asc', 'desc']

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams

  const sortBy: SortField = VALID_SORT_FIELDS.includes(params.sort as SortField)
    ? (params.sort as SortField)
    : 'created_at'
  const sortOrder: SortOrder = VALID_SORT_ORDERS.includes(params.order as SortOrder)
    ? (params.order as SortOrder)
    : 'desc'

  const filters: ExperimentFilters = {
    name: params.q,
    status: params.status,
    createdFrom: params.created_from,
    createdTo: params.created_to,
    updatedFrom: params.updated_from,
    updatedTo: params.updated_to,
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const experiments = await getExperiments(sortBy, sortOrder, filters)

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Experiments</h1>
        <Link
          href="/dashboard/experiments/new"
          className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          New experiment
        </Link>
      </div>

      {experiments.length === 0 && activeFilterCount === 0 ? (
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
      ) : (
        <>
          <Suspense fallback={null}>
            <FilterControls
              rightSlot={<SortControls sortBy={sortBy} sortOrder={sortOrder} />}
            />
          </Suspense>

          {experiments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-foreground/20 rounded-xl text-center px-6">
              <p className="font-semibold text-foreground">No results</p>
              <p className="text-sm text-foreground/50 mt-1">No experiments match your current filters.</p>
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
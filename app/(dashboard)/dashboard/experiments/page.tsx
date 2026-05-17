import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getExperiments } from '@/lib/actions/experiments'
import { getFolder, getFolderTree, getFolderBreadcrumbs } from '@/lib/actions/folders'
import type { SortField, SortOrder, ExperimentFilters } from '@/lib/actions/experiments.types'
import type { FolderNode } from '@/types/folder'
import ExperimentsList from '@/components/experiments/ExperimentsList'
import type { ExperimentView } from '@/components/experiments/ViewToggle'
import Breadcrumbs from '@/components/folders/Breadcrumbs'
import SubFolderGrid from '@/components/folders/SubFolderGrid'
import NewFolderForm from '@/components/folders/NewFolderForm'
import FolderActions from '@/components/folders/FolderActions'

export const metadata: Metadata = {
  title: 'Experiments',
}

const VALID_SORT_FIELDS: SortField[] = ['name', 'created_at', 'updated_at', 'status']
const VALID_SORT_ORDERS: SortOrder[] = ['asc', 'desc']
const VALID_VIEWS: ExperimentView[] = ['detail', 'tile', 'list']

function findNode(tree: FolderNode[], id: string): FolderNode | null {
  for (const node of tree) {
    if (node.id === id) return node
    const hit = findNode(node.children, id)
    if (hit) return hit
  }
  return null
}

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const archived = params.archived === '1'
  const folderId = params.folder?.trim() || null

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
    // At root, show only unfiled experiments so folders aren't double-counted
    // (the experiments inside them are already navigable via the folder grid).
    folderId: folderId ?? 'unfiled',
  }

  const [experiments, tree, currentFolder, breadcrumbs] = await Promise.all([
    getExperiments(sortBy, sortOrder, filters),
    getFolderTree(),
    folderId ? getFolder(folderId) : Promise.resolve(null),
    folderId ? getFolderBreadcrumbs(folderId) : Promise.resolve([]),
  ])

  // Unknown folder id (deleted, not yours, typo): drop back to root quietly.
  if (folderId && !currentFolder) {
    redirect(archived ? '/dashboard/experiments?archived=1' : '/dashboard/experiments')
  }

  const subFolders = folderId
    ? findNode(tree, folderId)?.children ?? []
    : tree

  const activeFilterCount = [
    filters.name, filters.status, filters.createdFrom, filters.createdTo,
    filters.updatedFrom, filters.updatedTo,
  ].filter(Boolean).length

  const folderQuery = folderId ? `&folder=${folderId}` : ''
  const activeTabHref = `/dashboard/experiments${folderId ? `?folder=${folderId}` : ''}`
  const archivedTabHref = `/dashboard/experiments?archived=1${folderQuery}`

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      active
        ? 'border-brand text-foreground'
        : 'border-transparent text-foreground/50 hover:text-foreground/80'
    }`

  const showEmptyState =
    subFolders.length === 0 && experiments.length === 0 && activeFilterCount === 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {currentFolder ? (
        <div className="mb-6 space-y-2">
          <Breadcrumbs trail={breadcrumbs} archived={archived} />
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{currentFolder.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <FolderActions folder={currentFolder} />
              <div className="h-5 w-px bg-foreground/10" />
              <NewFolderForm parentId={folderId} />
              {!archived && (
                <Link
                  href="/dashboard/experiments/new"
                  className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  New experiment
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-xl font-bold">Experiments</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <NewFolderForm parentId={null} />
            {!archived && (
              <Link
                href="/dashboard/experiments/new"
                className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                New experiment
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-foreground/10 mb-5">
        <Link href={activeTabHref} className={tabClass(!archived)}>
          Active
        </Link>
        <Link href={archivedTabHref} className={tabClass(archived)}>
          Archived
        </Link>
      </div>

      {showEmptyState ? (
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
            <p className="font-semibold text-foreground">
              {currentFolder ? 'No archived experiments here' : 'No archived experiments'}
            </p>
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
            <p className="font-semibold text-foreground">
              {currentFolder ? 'This folder is empty' : 'No experiments yet'}
            </p>
            <p className="text-sm text-foreground/50 mt-1 mb-6 max-w-xs">
              {currentFolder
                ? 'Drag experiments here, use “Move to…” from another folder, or create a new experiment.'
                : 'Create your first A/B test to start measuring what works.'}
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
        <div className="space-y-6">
          {subFolders.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-foreground/50 font-medium px-1">
                {currentFolder ? 'Sub-folders' : 'Folders'}
              </h2>
              <SubFolderGrid folders={subFolders} archived={archived} />
            </section>
          )}

          <section className="space-y-2">
            {subFolders.length > 0 && (
              <h2 className="text-xs uppercase tracking-wide text-foreground/50 font-medium px-1">
                Experiments
              </h2>
            )}
            {experiments.length === 0 ? (
              <p className="text-sm text-foreground/40 px-1 py-4">
                {currentFolder
                  ? 'No experiments in this folder yet.'
                  : 'No unfiled experiments — everything is organized.'}
              </p>
            ) : (
              <ExperimentsList
                experiments={experiments}
                view={view}
                sortBy={sortBy}
                sortOrder={sortOrder}
                archived={archived}
                folders={tree}
                currentFolderId={folderId}
                enableDrag
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
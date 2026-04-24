import type { ExperimentStatus } from '@/types/experiment'

const STATUS_STYLES: Record<ExperimentStatus, string> = {
  draft: 'bg-foreground/10 text-foreground/60',
  running: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  concluded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default function StatusBadge({ status }: { status: ExperimentStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}
import clsx from 'clsx'
import type { PmTaskLogStatus } from '@/lib/maintenance/api/technicianPm'

const MAP: Record<PmTaskLogStatus, [string, string]> = {
  PASS: ['Good', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'],
  FAIL: ['Not good', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'],
  NOT_APPLICABLE: ['N/A', 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'],
  PENDING: ['Pending', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'],
}

/** Per-item verdict pill (TechnicianPmExecuteScreen.StatusPill) */
export function TaskResultPill({ status }: { status: PmTaskLogStatus }) {
  const [label, cls] = MAP[status]
  return (
    <span className={clsx('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase', cls)}>
      {label}
    </span>
  )
}

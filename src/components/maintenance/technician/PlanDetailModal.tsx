'use client'

import clsx from 'clsx'
import { Modal } from '@/components/maintenance/ui'
import { fmtDate } from '@/lib/maintenance/format'
import { planIntervalLabel } from '@/lib/maintenance/api/technicianPm'
import type { PmPlanRow } from './PmCards'

/** What a recurring plan is, when its next task lands, and its checklist.
 *  Only opened for a plan with no work order behind it yet. */
export function PlanDetailModal({ row, onClose }: { row: PmPlanRow | null; onClose: () => void }) {
  if (!row) return null
  const insideWindow = Date.now() >= row.generatesAt
  const items = row.plan.items
  return (
    <Modal open onClose={onClose} title={row.machineName}>
      <div className="space-y-3">
        <p className="text-xs text-zinc-500">{row.machineCode}</p>
        <div>
          <p
            className={clsx(
              'text-sm font-bold',
              row.daysToDue < 0 ? 'text-red-600 dark:text-red-400' : 'text-factory-700 dark:text-factory-300',
            )}
          >
            {planIntervalLabel(row.plan)} · next due {fmtDate(row.plan.next_due_at)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {insideWindow
              ? "The task is due but hasn't been created yet — refresh in a little while."
              : `Its task is created on ${fmtDate(row.generatesAt)}, 7 days before the due date.`}
          </p>
        </div>
        {row.plan.description.trim() && <p className="text-sm text-zinc-700 dark:text-zinc-300">{row.plan.description}</p>}
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Checklist ({items.length})</p>
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li key={it.id} className="flex gap-2 text-sm">
              <span className="w-5 shrink-0 text-zinc-400">{(it.order_index ?? i) + 1}.</span>
              <span>
                <span className="text-zinc-900 dark:text-zinc-100">{it.title}</span>
                {it.description?.trim() && <span className="block text-xs text-zinc-500">{it.description}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  )
}

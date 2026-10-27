'use client'

import { ArrowLeftRight } from 'lucide-react'
import { Button, Field, Input, Modal } from '@/components/maintenance/ui'
import type { MachineTransfer } from '@/lib/maintenance/api/transfers'

/** Editable copy of a transfer (TransferRecordsViewModel.TransferEditDraft). */
export interface TransferEditDraft {
  id: number
  from_warehouse: string
  to_warehouse: string
  machine_name: string
  date: string
  condition: string
  machine_code: string
  reason: string
  authorised_person: string
  remarks: string
}

export const draftFrom = (r: MachineTransfer): TransferEditDraft => ({
  id: r.id,
  from_warehouse: r.from_warehouse,
  to_warehouse: r.to_warehouse,
  machine_name: r.machine_name,
  date: r.date ?? '',
  condition: r.condition ?? '',
  machine_code: r.machine_code ?? '',
  reason: r.reason ?? '',
  authorised_person: r.authorised_person ?? '',
  remarks: r.remarks ?? '',
})

const isIsoDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Edit sheet for a still-PENDING transfer (TransferRecordsScreen.TransferEditSheet).
 *  The route is read-only apart from the swap, exactly as on Android. */
export function TransferEditModal({
  draft,
  saving,
  error,
  onChange,
  onSave,
  onClose,
}: {
  draft: TransferEditDraft | null
  saving: boolean
  error?: string | null
  onChange: (d: TransferEditDraft) => void
  onSave: () => void
  onClose: () => void
}) {
  if (!draft) return null
  const set = (patch: Partial<TransferEditDraft>) => onChange({ ...draft, ...patch })

  const text = (label: string, key: keyof TransferEditDraft) => (
    <Field label={label}>
      <Input value={String(draft[key])} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  )

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title="Edit transfer"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <WarehouseBox label="From" value={draft.from_warehouse} />
          <button
            type="button"
            onClick={() => set({ from_warehouse: draft.to_warehouse, to_warehouse: draft.from_warehouse })}
            className="rounded-full p-2 text-factory-700 hover:bg-factory-100 dark:text-factory-300 dark:hover:bg-factory-500/15"
            aria-label="Swap direction"
            title="Swap direction"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <WarehouseBox label="To" value={draft.to_warehouse} />
        </div>
        {text('Machine name', 'machine_name')}
        <Field label="Date (YYYY-MM-DD)">
          <Input
            type={!draft.date || isIsoDay(draft.date) ? 'date' : 'text'}
            value={draft.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </Field>
        {text('Condition', 'condition')}
        {text('Model / Sr. No.', 'machine_code')}
        {text('Reason', 'reason')}
        {text('Authorised by', 'authorised_person')}
        {text('Remarks', 'remarks')}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}

function WarehouseBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{value.trim() || '—'}</p>
    </div>
  )
}

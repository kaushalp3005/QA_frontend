'use client'

import { ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '@/components/maintenance/ui'
import { fmtDate, fmtDateTime } from '@/lib/maintenance/format'
import { isApprovedTransfer, type MachineTransfer } from '@/lib/maintenance/api/transfers'

/** One transfer row (TransferRecordsScreen.TransferRecordCard). */
export function TransferRecordCard({
  record,
  acknowledging,
  deleting,
  ackDisabled,
  onAcknowledge,
  onEdit,
  onDelete,
}: {
  record: MachineTransfer
  acknowledging: boolean
  deleting: boolean
  /** Another acknowledge is in flight — one at a time, like the Android VM */
  ackDisabled: boolean
  onAcknowledge: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const approved = isApprovedTransfer(record)
  const date = record.date?.trim()

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-zinc-900 dark:text-zinc-50 break-words">
              {record.machine_name.trim() || 'Machine'}
            </p>
            <Badge tone={approved ? 'green' : 'amber'}>{approved ? 'APPROVED' : 'PENDING'}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {record.from_warehouse} → {record.to_warehouse}
            {date ? ` · ${fmtDate(date, date)}` : ''}
          </p>
          {record.condition?.trim() && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Condition: {record.condition}</p>
          )}
          {(record.machine_code?.trim() || record.reason?.trim() || record.authorised_person?.trim()) && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {[
                record.machine_code?.trim() && `Model / Sr. No.: ${record.machine_code}`,
                record.reason?.trim() && `Reason: ${record.reason}`,
                record.authorised_person?.trim() && `Authorised by ${record.authorised_person}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {record.remarks?.trim() && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Remarks: {record.remarks}</p>
          )}
          {record.created_at && (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Recorded {fmtDateTime(record.created_at)}</p>
          )}
        </div>
        {record.proof_photo_url && (
          <a
            href={record.proof_photo_url}
            target="_blank"
            rel="noreferrer"
            className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
            title="Open proof photo"
          >
            <ImageIcon className="absolute inset-0 m-auto h-5 w-5 text-zinc-400" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.proof_photo_url}
              alt="Machine proof photo"
              className="relative h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </a>
        )}
      </div>

      <div className="mt-3">
        {approved ? (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {record.acknowledged_by ? `Acknowledged by ${record.acknowledged_by}` : 'Acknowledged'}
            {record.acknowledged_at ? ` · ${fmtDateTime(record.acknowledged_at)}` : ''}
          </p>
        ) : record.can_acknowledge ? (
          <Button
            className="w-full"
            onClick={onAcknowledge}
            loading={acknowledging}
            disabled={ackDisabled && !acknowledging}
          >
            Acknowledge
          </Button>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Waiting for {record.to_warehouse} to acknowledge</p>
        )}
      </div>

      {/* The creator can edit / delete while the transfer is still PENDING. */}
      {record.can_edit && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={Pencil} onClick={onEdit} disabled={deleting}>
            Edit
          </Button>
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={onDelete}
            loading={deleting}
            className="!text-red-600 hover:!border-red-500 dark:!text-red-400"
          >
            Delete
          </Button>
        </div>
      )}
    </Card>
  )
}

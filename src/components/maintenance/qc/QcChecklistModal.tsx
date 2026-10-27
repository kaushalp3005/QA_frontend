'use client'

/**
 * QC "After Maintenance" checklist — ported from presentation/qc/QcChecklistSheet.kt
 * and QcChecklistData.kt. The 4 controlled housekeeping checks QC confirms per
 * machine; on approve they flow into the machine's after-maintenance rows of the
 * month's 50a/50b record.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Field, Input, Modal, Textarea } from '@/components/maintenance/ui'
import type { QcChecklistSnapshot } from '@/lib/maintenance/api/qc'
import { DisapproveDialog } from './DisapproveDialog'
import { AMBER_BTN } from './QcBits'

/** ChecklistCatalog.afterMaintenanceChecks */
export const AFTER_MAINTENANCE_CHECKS = [
  'Cleanliness of machine/ Tools box',
  'All tools are in tool box',
  'No nuts, Bolts and any spare parts on floor',
  'No grease or oil left over',
]

export type CheckResult = 'PASS' | 'FAIL' | 'UNANSWERED'

export interface QcChecklistItem {
  checkpoint: string
  result: CheckResult
  remarks: string
}

export interface QcChecklistDraft {
  items: QcChecklistItem[]
  notes: string
  photo: File | null
}

export const newDraft = (): QcChecklistDraft => ({
  items: AFTER_MAINTENANCE_CHECKS.map((checkpoint) => ({ checkpoint, result: 'UNANSWERED', remarks: '' })),
  notes: '',
  photo: null,
})

/** Approve = every after-maintenance check is PASS. Photo / notes stay optional. */
export const canApprove = (d: QcChecklistDraft) => d.items.length > 0 && d.items.every((i) => i.result === 'PASS')
/** Disapprove = at least one check answered, so an empty checklist is never recorded. */
export const canDisapprove = (d: QcChecklistDraft) => d.items.some((i) => i.result !== 'UNANSWERED')

export const toSnapshot = (d: QcChecklistDraft): QcChecklistSnapshot => ({
  after_maintenance: d.items.map((i) => ({
    checkpoint: i.checkpoint,
    status: i.result === 'FAIL' ? 'FAIL' : 'PASS',
    remarks: i.remarks.trim() ? i.remarks : null,
  })),
  notes: d.notes.trim() ? d.notes : null,
})

const NOTES_MAX = 500
const PHOTO_MAX_BYTES = 10 * 1024 * 1024

export function QcChecklistModal({
  open,
  machineName,
  machineCode,
  draft,
  submitting,
  error,
  onChange,
  onApprove,
  onDisapprove,
  onClose,
}: {
  open: boolean
  machineName: string
  machineCode: string
  draft: QcChecklistDraft
  submitting: boolean
  error: string | null
  onChange: (d: QcChecklistDraft) => void
  onApprove: () => void
  onDisapprove: (reason: string) => void
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [askReason, setAskReason] = useState(false)

  const preview = useMemo(() => (draft.photo ? URL.createObjectURL(draft.photo) : null), [draft.photo])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const setItem = (i: number, patch: Partial<QcChecklistItem>) =>
    onChange({ ...draft, items: draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })

  const onPhoto = (f: File | undefined) => {
    if (!f) return
    if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > PHOTO_MAX_BYTES) {
      toast.error('Photo must be a JPEG or PNG under 10 MB.')
      return
    }
    onChange({ ...draft, photo: f })
  }

  const approveOk = canApprove(draft)
  const disapproveOk = canDisapprove(draft)

  return (
    <>
      <Modal
        open={open}
        onClose={() => !submitting && onClose()}
        title={
          <span>
            QC checklist
            <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
              {[machineName, machineCode].filter(Boolean).join(' · ')}
            </span>
          </span>
        }
        size="lg"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className={AMBER_BTN}
              onClick={() => setAskReason(true)}
              disabled={submitting || !disapproveOk}
            >
              Disapprove
            </Button>
            <Button variant="success" onClick={onApprove} loading={submitting} disabled={!approveOk}>
              Approve
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h4 className="mb-3 border-b border-zinc-200 pb-2 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              After maintenance
            </h4>
            <div className="space-y-4">
              {draft.items.map((item, i) => (
                <div key={item.checkpoint}>
                  <p className="mb-1.5 text-sm text-zinc-800 dark:text-zinc-100">{item.checkpoint}</p>
                  <div className="flex gap-2" role="radiogroup" aria-label={item.checkpoint}>
                    <ResultChip label="Pass" tone="pass" selected={item.result === 'PASS'} onClick={() => setItem(i, { result: 'PASS' })} />
                    <ResultChip label="Fail" tone="fail" selected={item.result === 'FAIL'} onClick={() => setItem(i, { result: 'FAIL' })} />
                  </div>
                  {item.result === 'FAIL' && (
                    <Input
                      className="mt-2"
                      placeholder="Remarks"
                      value={item.remarks}
                      onChange={(e) => setItem(i, { remarks: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">After-QC photo (optional)</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                onPhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="QC after photo preview" className="h-44 w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-800" />
                <Button variant="ghost" size="sm" icon={Camera} className="mt-2" onClick={() => fileRef.current?.click()}>
                  Retake
                </Button>
              </>
            ) : (
              <Button variant="secondary" icon={Camera} className="w-full" onClick={() => fileRef.current?.click()}>
                Capture QC photo
              </Button>
            )}
          </section>

          <Field label={`Notes (optional, ${draft.notes.length}/${NOTES_MAX})`}>
            <Textarea
              rows={2}
              value={draft.notes}
              maxLength={NOTES_MAX}
              placeholder="e.g. minor discoloration on guard but within spec"
              onChange={(e) => onChange({ ...draft, notes: e.target.value.slice(0, NOTES_MAX) })}
            />
          </Field>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {!approveOk && !disapproveOk && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Answer at least one item to decide (all required items must PASS to approve).
            </p>
          )}
        </div>
      </Modal>

      <DisapproveDialog
        open={askReason}
        title="Disapprove — reason"
        label="Why is QC sending this back?"
        placeholder="e.g. sanitization residue still visible on rollers"
        confirmLabel="Submit disapproval"
        onClose={() => setAskReason(false)}
        onConfirm={(reason) => {
          setAskReason(false)
          onDisapprove(reason)
        }}
      />
    </>
  )
}

function ResultChip({
  label,
  tone,
  selected,
  onClick,
}: {
  label: string
  tone: 'pass' | 'fail'
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={clsx(
        'min-w-[80px] rounded-lg px-4 py-2 text-sm transition',
        selected
          ? tone === 'pass'
            ? 'border-2 border-emerald-600 bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'border-2 border-red-600 bg-red-50 font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300'
          : 'border border-zinc-300 font-medium text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-200',
      )}
    >
      {label}
    </button>
  )
}

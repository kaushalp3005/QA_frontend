'use client'

import { useEffect, useState } from 'react'
import { Button, Field, Modal, Textarea } from '@/components/maintenance/ui'

export const REASON_MIN = 4
export const REASON_MAX = 500

export const isValidReason = (r: string) => {
  const n = r.trim().length
  return n >= REASON_MIN && n <= REASON_MAX
}

/** Reason prompt for a QC disapproval (QcTicketDetailScreen.ConfirmDisapproveDialog
 *  and the QcChecklistSheet "Disapprove — reason" dialog). 4–500 chars, trimmed. */
export function DisapproveDialog({
  open,
  title,
  message,
  label,
  placeholder,
  confirmLabel = 'Disapprove',
  submitting,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message?: string
  label: string
  placeholder?: string
  confirmLabel?: string
  submitting?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const len = reason.trim().length
  const valid = isValidReason(reason)
  const showError = reason.length > 0 && !valid

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason)} disabled={!valid} loading={submitting}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>}
      <Field
        label={label}
        required
        error={showError ? `${len} / ${REASON_MAX} — reason must be ${REASON_MIN}–${REASON_MAX} characters.` : null}
        hint={`${len} / ${REASON_MAX}`}
      >
        <Textarea
          rows={4}
          value={reason}
          maxLength={REASON_MAX}
          placeholder={placeholder}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          autoFocus
        />
      </Field>
    </Modal>
  )
}

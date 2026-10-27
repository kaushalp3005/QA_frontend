'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, RefreshCw, Send } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Section,
  SkeletonRows,
} from '@/components/maintenance/ui'
import { TransferRecordCard } from '@/components/maintenance/transfer/TransferRecordCard'
import { TransferEditModal, draftFrom, type TransferEditDraft } from '@/components/maintenance/transfer/TransferEditModal'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import {
  acknowledgeTransfer,
  deleteTransfer,
  listTransfers,
  updateTransfer,
} from '@/lib/maintenance/api/transfers'

/** Transfer landing page (TransferRecordsScreen / VM): Create button, then every
 *  mt_machine_transfer row with acknowledge, and edit / delete for the creator. */
export default function TransferRecordsPage() {
  const { data, error, loading, reload } = useMtQuery(listTransfers, [])
  const records = data ?? []

  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [edit, setEdit] = useState<TransferEditDraft | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const acknowledge = async (id: number) => {
    if (acknowledgingId !== null) return
    setAcknowledgingId(id)
    try {
      await acknowledgeTransfer(id)
      toast.success('Transfer acknowledged')
      await reload()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to acknowledge transfer')
    } finally {
      setAcknowledgingId(null)
    }
  }

  const confirmDelete = async () => {
    const id = deleteConfirmId
    if (id === null) return
    setDeleteConfirmId(null)
    setBusyId(id)
    try {
      await deleteTransfer(id)
      toast.success('Transfer deleted')
      await reload()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete transfer')
    } finally {
      setBusyId(null)
    }
  }

  const saveEdit = async () => {
    const d = edit
    if (!d || savingEdit) return
    if (
      !d.machine_name.trim() ||
      !d.from_warehouse.trim() ||
      !d.to_warehouse.trim() ||
      d.from_warehouse.toLowerCase() === d.to_warehouse.toLowerCase()
    ) {
      setEditError('From and To must be set and different, and machine name is required.')
      return
    }
    setSavingEdit(true)
    setEditError(null)
    const orNull = (s: string) => (s.trim() ? s : null)
    try {
      // asset_id stays as it was — the edit keeps the existing register link.
      await updateTransfer(d.id, {
        from_warehouse: d.from_warehouse,
        to_warehouse: d.to_warehouse,
        machine_name: d.machine_name,
        date: orNull(d.date),
        machine_code: orNull(d.machine_code),
        condition: orNull(d.condition),
        reason: orNull(d.reason),
        authorised_person: orNull(d.authorised_person),
        remarks: orNull(d.remarks),
      })
      toast.success('Transfer updated')
      setEdit(null)
      await reload()
    } catch (e: any) {
      setEditError(e?.message || 'Failed to update transfer')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Machine Transfers"
        subtitle="Move assets between warehouses and confirm receipt"
        back={MT.dashboard}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <Button href={MT.transferNew} icon={Plus} className="mb-6 w-full py-3 sm:w-auto">
        Create Transfer
      </Button>

      <Section title="Records">
        <ErrorBanner error={error} onRetry={reload} />
        {loading && records.length === 0 ? (
          <SkeletonRows rows={4} />
        ) : records.length === 0 && !error ? (
          <EmptyState icon={Send} title="No transfers yet" message='Tap "Create Transfer" to record one.' />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {records.map((rec) => (
              <TransferRecordCard
                key={rec.id}
                record={rec}
                acknowledging={acknowledgingId === rec.id}
                ackDisabled={acknowledgingId !== null}
                deleting={busyId === rec.id}
                onAcknowledge={() => acknowledge(rec.id)}
                onEdit={() => {
                  setEditError(null)
                  setEdit(draftFrom(rec))
                }}
                onDelete={() => setDeleteConfirmId(rec.id)}
              />
            ))}
          </div>
        )}
      </Section>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Delete transfer?"
        message="This removes the transfer record and moves the machine back to its source warehouse."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirmId(null)}
      />

      <TransferEditModal
        draft={edit}
        saving={savingEdit}
        error={editError}
        onChange={setEdit}
        onSave={saveEdit}
        onClose={() => setEdit(null)}
      />
    </>
  )
}

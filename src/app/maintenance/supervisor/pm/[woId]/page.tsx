'use client'

/**
 * Supervisor review of a submitted PM (SupervisorPmReviewScreen.kt /
 * SupervisorPmReviewViewModel.kt): approve → PENDING_QC, or reject with a
 * 4–500 character reason → back to the technician for rework.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  Section,
  Textarea,
} from '@/components/maintenance/ui'
import { TaskLogBadge } from '@/components/maintenance/supervisor/WoBadges'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { fmtRelative } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import { getWorkOrder, qcBlob, supervisorApprove, supervisorReject } from '@/lib/maintenance/api/supervisor'

export default function SupervisorPmReviewPage({ params }: { params: { woId: string } }) {
  const woId = decodeURIComponent(params.woId)
  const router = useRouter()
  const session = useMtSession()
  const [submitting, setSubmitting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  const { data, error, loading, reload } = useMtQuery(async () => {
    const wo = await getWorkOrder(woId)
    // machine_id is an asset_id; fall back to the WO's own snapshot when unresolved.
    const asset = await listMachines()
      .then((list) => list.find((a) => a.asset_id === wo.machine_id) ?? null)
      .catch(() => null as MtMachine | null)
    return { wo, asset }
  }, [woId])

  const wo = data?.wo
  const done = () => router.push(MT.supervisor)

  const approve = async () => {
    if (!session) return
    setSubmitting(true)
    try {
      await supervisorApprove(woId, { supervisor_id: session.userId, supervisor_name: session.name, at: Date.now() })
      toast.success('Approved — sent to QC')
      done()
    } catch (e: any) {
      toast.error(e?.message || 'Approve failed')
    } finally {
      setSubmitting(false)
    }
  }

  const reject = async () => {
    const trimmed = reason.trim()
    if (trimmed.length < 4 || trimmed.length > 500) {
      toast.error('Reason must be 4–500 characters.')
      return
    }
    if (!session) return
    setRejectOpen(false)
    setSubmitting(true)
    try {
      await supervisorReject(woId, {
        supervisor_id: session.userId,
        supervisor_name: session.name,
        notes: trimmed,
        at: Date.now(),
      })
      toast.success('Sent back to technician for rework')
      done()
    } catch (e: any) {
      toast.error(e?.message || 'Reject failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) return <LoadingBlock />
  if (!wo)
    return (
      <>
        <PageHeader title="Review PM" back={MT.supervisor} />
        {error ? <ErrorBanner error={error} onRetry={reload} /> : <EmptyState title="Work order not found." />}
      </>
    )

  const machineName = data?.asset?.asset_name ?? wo.template_name ?? wo.machine_name
  const location = data?.asset?.sub_location ?? ''
  const isSubmitted = String(wo.status).toUpperCase() === 'SUBMITTED'
  // QC disapproval puts the PM back in the supervisor's inbox with QC's sign-off blob attached.
  const qc = isSubmitted ? qcBlob(wo) : null
  const bouncedByQc = !!qc && !!(wo.qc_acknowledged_at || qc.notes || qc.after_photo_url)
  const result = wo.overall_result?.trim()
  const logs = [...(wo.task_logs ?? [])].sort((a, b) => a.order_index - b.order_index)

  return (
    <>
      <PageHeader title="Review PM" back={MT.supervisor} />
      <div className="max-w-3xl space-y-4">
        {!isSubmitted && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            This work order is {String(wo.status).replace(/_/g, ' ').toLowerCase()} — it is no longer awaiting supervisor approval.
          </div>
        )}

        {bouncedByQc && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4" /> QC sent this back
            </p>
            <p className="mt-0.5 text-xs">
              by {wo.qc_acknowledged_by_name || 'QC'}
              {wo.qc_acknowledged_at ? ` · ${fmtRelative(wo.qc_acknowledged_at)}` : ''}
            </p>
            {qc?.notes?.trim() && (
              <>
                <p className="mt-2 text-sm font-semibold">Reason</p>
                <p className="text-sm">{qc.notes}</p>
              </>
            )}
            {qc?.after_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qc.after_photo_url} alt="QC photo" className="mt-2 h-44 w-full rounded-lg bg-white object-contain dark:bg-zinc-900" />
            )}
            <p className="mt-2 text-xs opacity-85">Approve to re-send to QC, or reject to send to technician for rework.</p>
          </div>
        )}

        <Card className="p-5">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{machineName}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {wo.machine_id}
            {location ? ` · ${location}` : ''}
          </p>
          <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{wo.template_name}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            Submitted by {wo.assigned_technician_name ?? ''} {wo.submitted_at ? fmtRelative(wo.submitted_at) : ''}
          </p>
          {result && (
            <p
              className={
                result.toUpperCase() === 'PASS'
                  ? 'mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400'
                  : 'mt-2 text-sm font-bold text-red-600 dark:text-red-400'
              }
            >
              Machine result: {result.toUpperCase()}
            </p>
          )}
        </Card>

        <Section title="Checklist results">
          <div className="space-y-2">
            {logs.length === 0 && <p className="text-sm text-zinc-500">No checklist items were logged.</p>}
            {logs.map((log, i) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {i + 1}. {log.title}
                  </p>
                  <TaskLogBadge status={String(log.status)} />
                </div>
                {log.notes?.trim() && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Remarks: {log.notes}</p>}
              </Card>
            ))}
          </div>
        </Section>

        {wo.spares?.length > 0 && (
          <Card className="p-4">
            <p className="mb-1.5 font-bold text-zinc-900 dark:text-zinc-100">Spares used</p>
            <ul className="space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
              {wo.spares.map((s) => (
                <li key={s.id}>
                  • {s.spare_name} — {s.quantity_used} {s.unit}
                  {s.notes?.trim() && <span className="block pl-4 text-xs text-zinc-500">{s.notes}</span>}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {wo.final_notes?.trim() && (
          <Card className="p-4">
            <p className="font-bold text-zinc-900 dark:text-zinc-100">Final tech notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{wo.final_notes}</p>
          </Card>
        )}

        {isSubmitted && (
          <div className="space-y-3 pt-2">
            <Button variant="success" className="w-full py-3 text-base" onClick={approve} loading={submitting}>
              {bouncedByQc ? 'Re-approve and send to QC' : 'Approve'}
            </Button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setReason('')
                setRejectOpen(true)
              }}
              className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-50"
            >
              Reject — needs rework
            </button>
          </div>
        )}
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject — reason"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={reject}
              disabled={reason.trim().length < 4 || reason.trim().length > 500 || submitting}
            >
              Submit rejection
            </Button>
          </>
        }
      >
        <Field label={`Why is this being sent back? (${reason.length}/500)`} hint="Required: 4–500 characters.">
          <Textarea
            rows={4}
            autoFocus
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="e.g. measurement on item 3 is outside tolerance, retake"
          />
        </Field>
      </Modal>
    </>
  )
}

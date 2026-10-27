'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { ArrowLeftRight, CheckCircle2, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { isQcRole, MtApiError, type MtSession } from '@/lib/maintenance/client'
import { fmtDateTime, fmtRelative } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  getWorkOrder,
  qcAcknowledgeWorkOrder,
  qcApproveWorkOrder,
  qcDisapproveWorkOrder,
  qcOverrideAcknowledgeWorkOrder,
  readSignOff,
  uploadPmPhoto,
  type PmWorkOrder,
  type QcSignOffBlob,
} from '@/lib/maintenance/api/qc'
import { isMe } from '@/lib/maintenance/api/qcInbox'
import { Button, Card, EmptyState, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { AMBER_BTN, Callout, PhotoBlock, TypeChip } from '@/components/maintenance/qc/QcBits'
import { isValidReason } from '@/components/maintenance/qc/DisapproveDialog'
import {
  QcChecklistModal,
  canApprove,
  canDisapprove,
  newDraft,
  toSnapshot,
  type QcChecklistDraft,
} from '@/components/maintenance/qc/QcChecklistModal'

/** QC acknowledge / approve / disapprove of a PM work order (QcPmDetailScreen / ViewModel). */
export default function QcPmPage({ params }: { params: { woId: string } }) {
  const woId = decodeURIComponent(params.woId)
  const session = useMtSession()
  if (!session) return null
  return <PmQc woId={woId} session={session} />
}

async function loadWo(woId: string) {
  const [wo, machines] = await Promise.all([
    getWorkOrder(woId).catch((e) => {
      if (e instanceof MtApiError && e.status === 404) return null
      throw e
    }),
    listMachines().catch(() => [] as MtMachine[]),
  ])
  const asset = wo ? machines.find((m) => m.asset_id === wo.machine_id) : undefined
  return { wo, asset }
}

function PmQc({ woId, session }: { woId: string; session: MtSession }) {
  const router = useRouter()
  const { data, error, loading, reload, setData } = useMtQuery(() => loadWo(woId), [woId])
  const [submitting, setSubmitting] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [draft, setDraft] = useState<QcChecklistDraft>(newDraft)
  const [sheetError, setSheetError] = useState<string | null>(null)

  const wo = data?.wo ?? null
  const asset = data?.asset
  const qc = isQcRole(session.role)
  const isQcHead = session.role === 'QC_HEAD'
  const heldByMe = !!wo?.qc_acknowledged_by && isMe(wo.qc_acknowledged_by, session)
  const heldByOther = !!wo?.qc_acknowledged_by && !heldByMe

  const machineName = asset?.asset_name || wo?.template_name || wo?.machine_name || wo?.machine_id || ''
  const machineCode = asset?.asset_id || wo?.machine_id || ''
  const machineLocation = asset?.sub_location || ''

  const patchWo = (next: PmWorkOrder) => setData((d) => (d ? { ...d, wo: next } : d))
  const ackBody = () => ({ user_id: session.userId, user_name: session.name, at: Date.now() })

  const acknowledge = async () => {
    if (!qc || !wo) return
    if (heldByOther) {
      toast.error(`Already picked up by ${wo.qc_acknowledged_by_name || 'another QC user'}`)
      return
    }
    setSubmitting(true)
    try {
      patchWo(await qcAcknowledgeWorkOrder(wo.id, ackBody()))
      toast.success('Picked up for QC.')
    } catch (e: any) {
      toast.error(e?.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const override = async () => {
    if (!wo || !isQcHead) return
    setSubmitting(true)
    try {
      patchWo(await qcOverrideAcknowledgeWorkOrder(wo.id, ackBody()))
      toast.success('QC override applied.')
    } catch (e: any) {
      toast.error(e?.message || 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const openSheet = () => {
    setDraft(newDraft())
    setSheetError(null)
    setSheet(true)
  }

  /** qcBlob(): the checklist snapshot + any after-photo URL + notes */
  const buildBlob = async (notes: string | null): Promise<QcSignOffBlob> => {
    const url = draft.photo ? (await uploadPmPhoto(draft.photo)).url : null
    const blob: QcSignOffBlob = { checklist: toSnapshot(draft) }
    if (url) blob.after_photo_url = url
    if (notes?.trim()) blob.notes = notes
    return blob
  }

  const approve = async () => {
    if (!qc || !wo || !canApprove(draft)) return
    setSubmitting(true)
    setSheetError(null)
    try {
      const notes = draft.notes.trim() ? draft.notes : null
      await qcApproveWorkOrder(wo.id, {
        user_id: session.userId,
        user_name: session.name,
        checklist: await buildBlob(notes),
        notes: notes ?? '',
        at: Date.now(),
      })
      setSheet(false)
      toast.success('QC approved — machine returned to operator.')
      router.push(MT.qcInbox)
    } catch (e: any) {
      const msg = e?.message || 'Action failed'
      setSheetError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  const disapprove = async (reason: string) => {
    if (!qc || !wo || !canDisapprove(draft)) return
    if (!isValidReason(reason)) {
      toast.error('Reason must be 4–500 characters.')
      return
    }
    const trimmed = reason.trim()
    setSubmitting(true)
    setSheetError(null)
    try {
      await qcDisapproveWorkOrder(wo.id, {
        user_id: session.userId,
        user_name: session.name,
        checklist: await buildBlob(trimmed),
        notes: trimmed,
        at: Date.now(),
      })
      setSheet(false)
      toast.success('Sent back to supervisor.')
      router.push(MT.qcInbox)
    } catch (e: any) {
      const msg = e?.message || 'Action failed'
      setSheetError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  const logs = [...(wo?.task_logs ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const spares = wo?.spares ?? []

  return (
    <>
      <PageHeader title={machineName || 'PM QC'} subtitle="PM QC" back={MT.qcInbox} />
      <ErrorBanner error={error} onRetry={reload} />

      {loading && !data ? (
        <LoadingBlock />
      ) : !wo ? (
        !error && <EmptyState title="Work order not found." />
      ) : (
        <div className="max-w-3xl space-y-4">
          <Card className="space-y-1.5 p-4">
            <div className="flex items-center gap-2">
              <TypeChip kind="PM" />
              <p className="font-bold text-zinc-900 dark:text-zinc-50">{machineName}</p>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {[machineCode, machineLocation].filter(Boolean).join(' · ')}
            </p>
            {wo.template_name && <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{wo.template_name}</p>}
          </Card>

          <Card className="space-y-1.5 p-4 text-sm">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Technician + supervisor</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Performed by {wo.assigned_technician_name || '—'}
              {wo.submitted_at ? ` · submitted ${fmtRelative(wo.submitted_at)}` : ''}
            </p>
            {wo.overall_result?.trim() && (
              <p
                className={clsx(
                  'font-bold',
                  wo.overall_result.toUpperCase() === 'PASS'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                )}
              >
                Machine result: {wo.overall_result.toUpperCase()}
              </p>
            )}
            {wo.supervisor_approved_by_name && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Approved by {wo.supervisor_approved_by_name}
                {wo.supervisor_approved_at ? ` · ${fmtRelative(wo.supervisor_approved_at)}` : ''}
              </p>
            )}
          </Card>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Checklist results</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No checklist items on this work order.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <Card key={log.id} className="space-y-1 p-3.5">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 font-bold text-zinc-900 dark:text-zinc-50">
                      {i + 1}. {log.title}
                    </p>
                    <TaskPill status={log.status} />
                  </div>
                  {log.notes?.trim() && <p className="text-xs text-zinc-600 dark:text-zinc-300">Remarks: {log.notes}</p>}
                </Card>
              ))}
            </div>
          )}

          {spares.length > 0 && (
            <Card className="space-y-1.5 p-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Spares used</h3>
              {spares.map((s) => (
                <div key={s.id}>
                  <p className="text-sm text-zinc-800 dark:text-zinc-100">
                    • {s.spare_name} — {s.quantity_used} {s.unit}
                  </p>
                  {s.notes?.trim() && <p className="pl-4 text-xs text-zinc-500 dark:text-zinc-400">{s.notes}</p>}
                </div>
              ))}
            </Card>
          )}

          {wo.final_notes?.trim() && (
            <Card className="p-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Final tech notes</h3>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">{wo.final_notes}</p>
            </Card>
          )}

          <hr className="border-zinc-200 dark:border-zinc-800" />

          <ActionSection
            wo={wo}
            qc={qc}
            isQcHead={isQcHead}
            heldByMe={heldByMe}
            heldByOther={heldByOther}
            submitting={submitting}
            onAcknowledge={acknowledge}
            onOpenChecklist={openSheet}
            onOverride={override}
          />
        </div>
      )}

      {wo && (
        <QcChecklistModal
          open={sheet}
          machineName={machineName}
          machineCode={machineCode}
          draft={draft}
          submitting={submitting}
          error={sheetError}
          onChange={(d) => {
            setDraft(d)
            setSheetError(null)
          }}
          onApprove={approve}
          onDisapprove={disapprove}
          onClose={() => setSheet(false)}
        />
      )}
    </>
  )
}

function TaskPill({ status }: { status?: string }) {
  const s = (status || 'PENDING').toUpperCase()
  const [label, cls] =
    s === 'PASS'
      ? ['GOOD', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300']
      : s === 'FAIL'
        ? ['NOT GOOD', 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300']
        : s === 'NOT_APPLICABLE'
          ? ['N/A', 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300']
          : ['PENDING', 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300']
  return <span className={clsx('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', cls)}>{label}</span>
}

function SignOffDetails({ blob, approved }: { blob: QcSignOffBlob | null; approved: boolean }) {
  if (!blob) return null
  const lines = blob.checklist?.after_maintenance ?? []
  const notes = blob.notes ?? blob.checklist?.notes
  return (
    <>
      {notes?.trim() && (
        <>
          <p className="pt-1 font-semibold">{approved ? 'Notes' : 'Reason'}</p>
          <p className="whitespace-pre-wrap">{notes}</p>
        </>
      )}
      {lines.length > 0 && (
        <ul className="pt-1 text-xs">
          {lines.map((l) => (
            <li key={l.checkpoint}>
              {l.status === 'PASS' ? '✓' : '✗'} {l.checkpoint}
              {l.remarks ? ` — ${l.remarks}` : ''}
            </li>
          ))}
        </ul>
      )}
      {blob.after_photo_url && (
        <div className="pt-2">
          <PhotoBlock src={blob.after_photo_url} alt="QC photo" />
        </div>
      )}
    </>
  )
}

function ActionSection({
  wo,
  qc,
  isQcHead,
  heldByMe,
  heldByOther,
  submitting,
  onAcknowledge,
  onOpenChecklist,
  onOverride,
}: {
  wo: PmWorkOrder
  qc: boolean
  isQcHead: boolean
  heldByMe: boolean
  heldByOther: boolean
  submitting: boolean
  onAcknowledge: () => void
  onOpenChecklist: () => void
  onOverride: () => void
}) {
  const blob = readSignOff(wo.qc_checklist)

  if (wo.status === 'PENDING_QC') {
    if (!qc)
      return (
        <Callout tone="amber" title="Awaiting QC verification">
          {wo.qc_acknowledged_by_name && <p>Picked up by QC: {wo.qc_acknowledged_by_name}</p>}
        </Callout>
      )
    if (!wo.qc_acknowledged_by)
      return (
        <Button
          className={`h-12 w-full text-base ${AMBER_BTN}`}
          icon={Wrench}
          onClick={onAcknowledge}
          loading={submitting}
        >
          Acknowledge for QC
        </Button>
      )
    if (heldByMe)
      return (
        <div className="space-y-3">
          <Callout tone="amber" title="Picked up by you">
            {wo.qc_acknowledged_at && <p>at {fmtDateTime(wo.qc_acknowledged_at)}</p>}
          </Callout>
          <Button className="h-12 w-full text-base" icon={CheckCircle2} onClick={onOpenChecklist} disabled={submitting}>
            Run QC checklist
          </Button>
        </div>
      )
    if (heldByOther)
      return (
        <div className="space-y-3">
          <Callout tone="amber" title={`Picked up by ${wo.qc_acknowledged_by_name || 'another QC user'}`}>
            {wo.qc_acknowledged_at && <p>at {fmtDateTime(wo.qc_acknowledged_at)}</p>}
          </Callout>
          {isQcHead && (
            <Button variant="secondary" icon={ArrowLeftRight} className="w-full" onClick={onOverride} loading={submitting}>
              Override — take this over as QC Head
            </Button>
          )}
        </div>
      )
  }

  // The backend records a QC approval as CLOSED; the decider is the QC who picked it up.
  if (wo.status === 'QC_APPROVED' || wo.status === 'CLOSED')
    return (
      <Callout tone="green" title="QC approved">
        <p>
          by {wo.qc_acknowledged_by_name || 'QC'}
          {wo.closed_at ? ` at ${fmtDateTime(wo.closed_at)}` : ''}
        </p>
        <SignOffDetails blob={blob} approved />
      </Callout>
    )

  // A disapproval returns the WO to SUBMITTED with the QC sign-off stored.
  if (wo.status === 'SUBMITTED' && blob)
    return (
      <Callout tone="red" title="Sent back to supervisor">
        <p>by {wo.qc_acknowledged_by_name || 'QC'}</p>
        <SignOffDetails blob={blob} approved={false} />
      </Callout>
    )

  return <p className="text-sm text-zinc-500 dark:text-zinc-400">This PM is not awaiting QC.</p>
}

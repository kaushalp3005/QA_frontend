'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, CheckCircle2, Wrench, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { isQcRole, type MtSession } from '@/lib/maintenance/client'
import { fmtDateTime, fmtRelative, plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { qcAcknowledgeBreakdown, qcApproveBreakdown, qcDisapproveBreakdown } from '@/lib/maintenance/api/qc'
import { flagDecision, isMe, loadQcFlag, type QcFlag } from '@/lib/maintenance/api/qcInbox'
import { clearClaim, getClaim, setClaim, type QcClaim } from '@/lib/maintenance/api/qcClaims'
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { AMBER_BTN, Callout, SeverityChip } from '@/components/maintenance/qc/QcBits'
import { DisapproveDialog, isValidReason } from '@/components/maintenance/qc/DisapproveDialog'

/** QC verification of one breakdown repair (QcTicketDetailScreen / ViewModel). */
export default function QcTicketPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const session = useMtSession()
  if (!session) return null
  return <Ticket id={id} session={session} />
}

function Ticket({ id, session }: { id: string; session: MtSession }) {
  const router = useRouter()
  const { data, error, loading, reload } = useMtQuery(() => loadQcFlag(id), [id])
  // Local record of the QC pickup — the backend doesn't return it (see qcClaims.ts)
  const [claim, setClaimState] = useState<QcClaim | null>(() => getClaim(id))
  const [submitting, setSubmitting] = useState(false)
  const [confirm, setConfirm] = useState<'APPROVE' | 'DISAPPROVE' | null>(null)
  // Set when an acknowledge was refused — the QC Head can then take it over.
  const [ackRefused, setAckRefused] = useState(false)

  const flag = data?.flag ?? null
  const asset = flag ? data?.assets.get(flag.asset_id) : undefined
  const qc = isQcRole(session.role)
  const isQcHead = session.role === 'QC_HEAD'
  const heldByMe = !!claim && isMe(claim.userId, session)
  const heldByOther = !!claim && !heldByMe

  const acknowledge = async (override: boolean) => {
    if (!qc || !flag) return
    if (override && !isQcHead) return
    setSubmitting(true)
    const now = Date.now()
    try {
      await qcAcknowledgeBreakdown(flag.id, {
        user_id: session.userId,
        user_name: session.name,
        qc_checked_by: session.username,
        acknowledged_at: now,
        override,
      })
      const c = { userId: session.userId, userName: session.name, at: now }
      setClaim(flag.id, c)
      setClaimState(c)
      setAckRefused(false)
      toast.success(override ? 'QC override applied.' : 'Picked up for QC.')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to acknowledge for QC')
      if (!override) setAckRefused(true)
    } finally {
      setSubmitting(false)
    }
  }

  const approve = async () => {
    if (!qc || !flag) return
    setSubmitting(true)
    try {
      await qcApproveBreakdown(flag.id, {
        user_id: session.userId,
        user_name: session.name,
        decided_at: Date.now(),
        checklist_json: '{}',
        after_photo_path: null,
        notes: null,
      })
      clearClaim(flag.id)
      setConfirm(null)
      toast.success('QC approved — machine returned to operator.')
      router.push(MT.qcInbox)
    } catch (e: any) {
      toast.error(e?.message || "Couldn't submit the QC approval to the server. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  const disapprove = async (reason: string) => {
    if (!qc || !flag) return
    if (!isValidReason(reason)) {
      toast.error('Reason must be 4–500 characters.')
      return
    }
    setSubmitting(true)
    try {
      await qcDisapproveBreakdown(flag.id, {
        user_id: session.userId,
        user_name: session.name,
        decided_at: Date.now(),
        checklist_json: '{}',
        after_photo_path: null,
        reason: reason.trim(),
      })
      clearClaim(flag.id)
      setConfirm(null)
      toast.success('Sent back to technician.')
      router.push(MT.qcInbox)
    } catch (e: any) {
      toast.error(e?.message || "Couldn't submit the QC decision to the server. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  const title = asset?.asset_name || flag?.asset_name || 'QC Ticket'

  return (
    <>
      <PageHeader title={title} subtitle="Breakdown QC" back={MT.qcInbox} />
      <ErrorBanner error={error} onRetry={reload} />

      {loading && !data ? (
        <LoadingBlock />
      ) : !flag ? (
        !error && <EmptyState title="Ticket not found." />
      ) : (
        <div className="max-w-3xl space-y-4">
          <Card className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-zinc-900 dark:text-zinc-50">{title}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {[
                  flag.asset_id !== title ? flag.asset_id : null,
                  asset?.sub_location,
                  flag.building || asset?.building ? plantLabel(flag.building || asset?.building) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <SeverityChip severity={flag.severity} />
          </Card>

          <Card className="space-y-1.5 p-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Operator report</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Reported by {flag.reporter_name || flag.reported_by || '—'}
              {flag.reported_at ? ` · ${fmtRelative(flag.reported_at)}` : ''}
            </p>
            {flag.reported_at && <p className="text-[11px] text-zinc-400">{fmtDateTime(flag.reported_at)}</p>}
            <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">{flag.description || '—'}</p>
          </Card>

          <Card className="space-y-1.5 p-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Technician repair</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Repaired by {flag.resolved_by_name || '—'}
              {flag.resolved_at ? ` · ${fmtRelative(flag.resolved_at)}` : ''}
            </p>
            {flag.resolved_at && <p className="text-[11px] text-zinc-400">{fmtDateTime(flag.resolved_at)}</p>}
            <p className="pt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Parts used / work done</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">{flag.parts_used || ''}</p>
          </Card>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          <ActionSection
            flag={flag}
            qc={qc}
            isQcHead={isQcHead}
            claim={claim}
            heldByMe={heldByMe}
            heldByOther={heldByOther}
            ackRefused={ackRefused}
            submitting={submitting}
            onAcknowledge={() => acknowledge(false)}
            onOverride={() => acknowledge(true)}
            onApprove={() => setConfirm('APPROVE')}
            onDisapprove={() => setConfirm('DISAPPROVE')}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'APPROVE'}
        title="Approve QC?"
        message="This closes the breakdown and returns the machine to the operator. You can't undo this."
        confirmLabel="Approve"
        loading={submitting}
        onConfirm={approve}
        onClose={() => !submitting && setConfirm(null)}
      />
      <DisapproveDialog
        open={confirm === 'DISAPPROVE'}
        title="Disapprove QC?"
        message="The breakdown will be sent back to the same technician for rework."
        label="Reason (4–500 chars)"
        submitting={submitting}
        onConfirm={disapprove}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}

function ActionSection({
  flag,
  qc,
  isQcHead,
  claim,
  heldByMe,
  heldByOther,
  ackRefused,
  submitting,
  onAcknowledge,
  onOverride,
  onApprove,
  onDisapprove,
}: {
  flag: QcFlag
  qc: boolean
  isQcHead: boolean
  claim: QcClaim | null
  heldByMe: boolean
  heldByOther: boolean
  ackRefused: boolean
  submitting: boolean
  onAcknowledge: () => void
  onOverride: () => void
  onApprove: () => void
  onDisapprove: () => void
}) {
  const overrideBtn = (
    <Button variant="secondary" icon={ArrowLeftRight} className="w-full" onClick={onOverride} loading={submitting}>
      Override — take this over as QC Head
    </Button>
  )

  if (flag.status === 'PENDING_QC') {
    // Supervisor / Head reach this from "QC Status" — view only.
    if (!qc)
      return (
        <Callout tone="amber" title="Awaiting QC verification">
          {claim && <p>Picked up by QC: {claim.userName}</p>}
        </Callout>
      )
    if (!claim)
      return (
        <div className="space-y-3">
          <Button
            className={`h-12 w-full text-base ${AMBER_BTN}`}
            icon={Wrench}
            onClick={onAcknowledge}
            loading={submitting}
          >
            Acknowledge for QC
          </Button>
          {ackRefused && isQcHead && overrideBtn}
        </div>
      )
    if (heldByMe)
      return (
        <div className="space-y-3">
          <Callout tone="amber" title="Picked up by you">
            <p>at {fmtDateTime(claim.at)}</p>
          </Callout>
          <Button variant="success" className="h-12 w-full text-base" icon={CheckCircle2} onClick={onApprove} disabled={submitting}>
            Approve
          </Button>
          <Button variant="danger" className="h-12 w-full text-base" icon={XCircle} onClick={onDisapprove} disabled={submitting}>
            Disapprove
          </Button>
        </div>
      )
    if (heldByOther)
      return (
        <div className="space-y-3">
          <Callout tone="amber" title={`Picked up by ${claim.userName || 'another QC user'}`}>
            <p>at {fmtDateTime(claim.at)}</p>
          </Callout>
          {isQcHead && overrideBtn}
        </div>
      )
  }

  const decision = flagDecision(flag)
  if (decision === 'APPROVED')
    return (
      <Callout tone="green" title="QC approved">
        <p>
          by {flag.qc_decided_by_name || 'QC'}
          {flag.qc_decided_at ? ` at ${fmtDateTime(flag.qc_decided_at)}` : ''}
        </p>
        {flag.qc_decision_notes?.trim() && (
          <>
            <p className="pt-1 font-semibold">Notes</p>
            <p className="whitespace-pre-wrap">{flag.qc_decision_notes}</p>
          </>
        )}
      </Callout>
    )
  if (decision === 'REJECTED')
    return (
      <Callout tone="red" title="Disapproved — sent back to technician">
        <p>
          by {flag.qc_decided_by_name || 'QC'}
          {flag.qc_decided_at ? ` on ${fmtDateTime(flag.qc_decided_at)}` : ''}
        </p>
        <p className="pt-1 font-semibold">Reason</p>
        <p className="whitespace-pre-wrap">{flag.qc_decision_notes || ''}</p>
      </Callout>
    )
  return <p className="text-sm text-zinc-500 dark:text-zinc-400">This ticket is not awaiting QC.</p>
}

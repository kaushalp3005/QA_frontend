'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle, Play } from 'lucide-react'
import { Button, Card, EmptyState, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { HistoryStatusChip, PmStatusChip } from '@/components/maintenance/technician/PmCards'
import { TaskResultPill } from '@/components/maintenance/technician/TaskResultPill'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDate, fmtDateTime, fmtNumber, fmtRelative } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  acknowledgeWorkOrder,
  getWorkOrder,
  PM_ACTIVE,
  startWorkOrder,
  type PmWorkOrder,
} from '@/lib/maintenance/api/technicianPm'

/** One PM work order (TechnicianPmDetailScreen): Acknowledge → Start → execute. */
export default function PmDetailPage({ params }: { params: { woId: string } }) {
  const woId = decodeURIComponent(params.woId)
  const router = useRouter()
  // Always re-pulled so a supervisor rejection / QC bounce is visible before acting.
  const q = useMtQuery(() => getWorkOrder(woId), [woId])
  const machineId = q.data?.machine_id
  const asset = useMtQuery(async () => {
    if (!machineId) return null
    const list = await listMachines().catch(() => [] as MtMachine[])
    return list.find((m) => m.asset_id === machineId) ?? null
  }, [machineId])
  const [busy, setBusy] = useState(false)

  const wo = q.data
  const name = asset.data?.asset_name ?? (wo ? wo.machine_name || wo.template_name : null)

  const act = async (kind: 'ack' | 'start') => {
    setBusy(true)
    try {
      if (kind === 'ack') {
        q.setData(await acknowledgeWorkOrder(woId))
        toast.success('Acknowledged.')
      } else {
        await startWorkOrder(woId)
        router.push(MT.pmExecute(woId))
      }
    } catch (e: any) {
      toast.error(e?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={name ?? 'PM work order'} back={MT.pm} />
      <ErrorBanner error={q.error} onRetry={q.reload} />

      {q.loading && !wo ? (
        <LoadingBlock />
      ) : !wo ? (
        !q.error && <EmptyState title="PM work order not found." />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          {wo.supervisor_rejected_at && wo.status === 'IN_PROGRESS' && (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4" />
                Supervisor sent this back {fmtRelative(wo.supervisor_rejected_at)}
              </p>
              <hr className="border-red-200 dark:border-red-500/30" />
              <p className="text-sm font-semibold">Reason</p>
              <p className="whitespace-pre-wrap text-sm">{wo.supervisor_rejection_notes?.trim() || '(no reason given)'}</p>
              <p className="text-xs">Open Continue execution below to address the feedback and re-submit.</p>
            </div>
          )}

          <Card className="p-4">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-zinc-900 dark:text-zinc-50">{name}</p>
                  <p className="text-xs text-zinc-500">
                    {asset.data?.asset_id ?? wo.machine_id}
                    {asset.data?.sub_location ? ` · ${asset.data.sub_location}` : ''}
                  </p>
                </div>
                {PM_ACTIVE.includes(wo.status) ? <PmStatusChip status={wo.status} /> : <HistoryStatusChip status={wo.status} />}
              </div>
              <hr className="border-zinc-200 dark:border-zinc-800" />
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{wo.template_name}</p>
              {wo.estimated_duration_minutes > 0 && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Estimated ~{wo.estimated_duration_minutes} min</p>
              )}
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Scheduled {fmtDate(wo.scheduled_date)}</p>
              {wo.task_logs.length > 0 && <p className="text-xs text-zinc-500">{wo.task_logs.length} checklist items</p>}
            </div>
          </Card>

          <Actions wo={wo} busy={busy} onAck={() => act('ack')} onStart={() => act('start')} />

          {!PM_ACTIVE.includes(wo.status) && <SubmittedResults wo={wo} />}
        </div>
      )}
    </>
  )
}

function Banner({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="font-bold text-zinc-900 dark:text-zinc-100">{title}</p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{body}</p>
    </div>
  )
}

function Actions({ wo, busy, onAck, onStart }: { wo: PmWorkOrder; busy: boolean; onAck: () => void; onStart: () => void }) {
  switch (wo.status) {
    case 'NOTIFIED':
      return (
        <Button variant="secondary" icon={AlertTriangle} className="w-full py-3" loading={busy} onClick={onAck}>
          Acknowledge
        </Button>
      )
    case 'ACKNOWLEDGED':
      return (
        <Button variant="success" icon={Play} className="w-full py-3.5 text-base" loading={busy} onClick={onStart}>
          Start PM
        </Button>
      )
    case 'IN_PROGRESS':
      return (
        <Button icon={Play} className="w-full py-3" href={MT.pmExecute(wo.id)}>
          Continue execution
        </Button>
      )
    case 'SUBMITTED':
      return (
        <Banner
          title="Submitted for supervisor approval"
          body={`Submitted ${wo.submitted_at ? fmtRelative(wo.submitted_at) : ''}. The supervisor reviews it next.`}
        />
      )
    case 'SUPERVISOR_APPROVED':
    case 'PENDING_QC':
      return (
        <Banner
          title="Supervisor approved"
          body={`Approved by ${wo.supervisor_approved_by_name ?? 'supervisor'}. Awaiting QC verification next.`}
        />
      )
    case 'QC_APPROVED':
    case 'CLOSED':
      return (
        <Banner
          title={wo.status === 'CLOSED' ? 'Closed' : 'QC approved'}
          body={`QC verified this PM${wo.closed_at ? ` on ${fmtDateTime(wo.closed_at)}` : ''}.`}
        />
      )
    default:
      return <Banner title={wo.status.replace(/_/g, ' ')} body="This PM is in a final or non-actionable state." />
  }
}

/** What was submitted — read-only, for work that has left the technician's hands. */
function SubmittedResults({ wo }: { wo: PmWorkOrder }) {
  if (wo.task_logs.length === 0 && wo.spares.length === 0 && !wo.final_notes) return null
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Submitted results</p>
        {wo.overall_result && (
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Machine result: {wo.overall_result}</span>
        )}
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {wo.task_logs.map((l, i) => (
          <li key={l.id} className="flex items-start gap-2 py-2 text-sm">
            <span className="w-6 shrink-0 font-bold text-zinc-400">{i + 1}.</span>
            <span className="min-w-0 flex-1">
              <span className="text-zinc-900 dark:text-zinc-100">{l.title}</span>
              {l.notes && <span className="block text-xs text-zinc-500">{l.notes}</span>}
            </span>
            <TaskResultPill status={l.status} />
          </li>
        ))}
      </ul>
      {wo.spares.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Spares used</p>
          <ul className="space-y-0.5 text-sm text-zinc-800 dark:text-zinc-200">
            {wo.spares.map((s) => (
              <li key={s.id}>
                {s.spare_name} — {fmtNumber(s.quantity_used)} {s.unit}
              </li>
            ))}
          </ul>
        </div>
      )}
      {wo.final_notes && (
        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Final notes</p>
          <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{wo.final_notes}</p>
        </div>
      )}
    </Card>
  )
}

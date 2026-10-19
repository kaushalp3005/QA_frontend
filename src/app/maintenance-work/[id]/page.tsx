'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Hand,
  RefreshCw,
  Undo2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import StatusBadge, { plantLabel } from '@/components/maintenance-work/StatusBadge'
import { Spinner } from '@/components/ui/Loader'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getStoredUser } from '@/lib/api/auth'
import { cn } from '@/lib/styles'
import {
  AWAITING_QC,
  MODULE_CODE,
  MaintenanceWorkError,
  WorkOrderDetail,
  formatIstDateTime,
  maintenanceWorkApi,
  waitingFor,
} from '@/lib/api/maintenanceWork'

export default function MaintenanceWorkDetailPage() {
  return (
    <DashboardLayout>
      <ModuleGuard module={MODULE_CODE}>
        <WorkOrderView />
      </ModuleGuard>
    </DashboardLayout>
  )
}

function WorkOrderView() {
  const params = useParams()
  const id = decodeURIComponent(String(params?.id || ''))
  const { currentCompany } = useCompany()

  const [wo, setWo] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setWo(await maintenanceWorkApi.get(id, currentCompany))
    } catch (err) {
      const message = err instanceof MaintenanceWorkError ? err.message : 'Failed to load this work order.'
      setError(message)
      if (!(err instanceof MaintenanceWorkError) || err.status !== 401) toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [id, currentCompany])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/maintenance-work"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-500 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to maintenance work
      </Link>

      {loading && !wo ? (
        <div className="surface-card px-6 py-20 text-center">
          <Spinner size={32} className="text-brand-500 mx-auto" />
          <p className="mt-4 text-sm font-medium text-ink-500">Loading work order…</p>
        </div>
      ) : error || !wo ? (
        <div className="surface-card px-6 py-16 text-center">
          <div className="bg-danger-50 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-danger-700" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink-600">Could not load this work order</h3>
          <p className="mt-1 text-xs text-ink-400">{error}</p>
          <button onClick={load} className="btn-outline mt-4 px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      ) : (
        <>
          <Header wo={wo} />
          {wo.status === AWAITING_QC && (
            <QcPanel wo={wo} company={currentCompany} onChange={setWo} onStale={load} />
          )}
          <PreviousQcDecision wo={wo} />
          <Checklist wo={wo} />
          <Notes wo={wo} />
          <Spares wo={wo} />
          <Timeline wo={wo} />
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------- */

function Header({ wo }: { wo: WorkOrderDetail }) {
  return (
    <div className="surface-card p-5 mb-4 animate-fade-in-up">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-ink-600 truncate">{wo.machine_name}</h1>
            <StatusBadge status={wo.status} />
            {wo.overall_result && <ResultBadge result={wo.overall_result} label={`Overall ${wo.overall_result}`} />}
          </div>
          <p className="mt-1 text-sm text-ink-500">
            <span className="font-mono">{wo.machine_id}</span>
            {' · '}
            {plantLabel(wo.plant)}
            {wo.asset_name && wo.asset_name !== wo.machine_name && <> · {wo.asset_name}</>}
          </p>
          {!wo.in_asset_register && (
            <p className="mt-1 text-xs text-warning-700">
              This machine is not in the asset register, so its plant is unknown.
            </p>
          )}
        </div>
        <div className="text-right text-sm text-ink-500">
          <div className="font-mono font-semibold text-ink-600">{wo.id}</div>
          <div className="text-xs text-ink-400">{wo.template_name}</div>
          <div className="text-xs text-ink-400">Technician: {wo.assigned_technician_name || '—'}</div>
        </div>
      </div>
    </div>
  )
}

function QcPanel({
  wo,
  company,
  onChange,
  onStale,
}: {
  wo: WorkOrderDetail
  company: string
  onChange: (wo: WorkOrderDetail) => void
  onStale: () => void
}) {
  const { canEdit } = usePermissions()
  const [notes, setNotes] = useState('')
  const [confirming, setConfirming] = useState<'approve' | 'disapprove' | null>(null)
  const [busy, setBusy] = useState(false)

  const me = (getStoredUser()?.email || '').toLowerCase()
  const pickedUpByMe = Boolean(wo.qc_acknowledged_by) && wo.qc_acknowledged_by?.toLowerCase() === me
  const pickedUpByOther = Boolean(wo.qc_acknowledged_by) && !pickedUpByMe

  if (!canEdit(MODULE_CODE)) {
    return (
      <div className="surface-card p-5 mb-4 border-l-4 border-l-warning-500 animate-fade-in-up">
        <p className="text-sm font-semibold text-ink-600">Awaiting QC sign-off</p>
        <p className="mt-1 text-xs text-ink-400">
          You can view this work order. Approving it needs edit access to Maintenance Work — ask a QA
          administrator.
        </p>
      </div>
    )
  }

  const run = async (action: 'acknowledge' | 'approve' | 'disapprove') => {
    if (action === 'disapprove' && !notes.trim()) {
      toast.error('Write the reason for sending it back.')
      return
    }
    setBusy(true)
    try {
      const updated =
        action === 'acknowledge'
          ? await maintenanceWorkApi.acknowledge(wo.id, company)
          : action === 'approve'
            ? await maintenanceWorkApi.approve(wo.id, company, notes.trim())
            : await maintenanceWorkApi.disapprove(wo.id, company, notes.trim())
      onChange(updated)
      setConfirming(null)
      setNotes('')
      toast.success(
        action === 'acknowledge'
          ? 'Picked up for review'
          : action === 'approve'
            ? `${wo.id} closed — machine back in service`
            : `${wo.id} sent back to the maintenance supervisor`,
      )
    } catch (err) {
      const message = err instanceof MaintenanceWorkError ? err.message : 'Something went wrong.'
      toast.error(message)
      // 409: someone else acted on it first. Show what it is now.
      if (err instanceof MaintenanceWorkError && err.status === 409) onStale()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface-card p-5 mb-4 border-l-4 border-l-warning-500 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-ink-600">QC sign-off</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            Supervisor {wo.supervisor_approved_by_name || ''} approved this{' '}
            {wo.supervisor_approved_at ? `${waitingFor(wo.supervisor_approved_at)} ago` : ''}. Review the
            checklist below, then close it or send it back.
          </p>
        </div>
        {!wo.qc_acknowledged_by ? (
          <button
            onClick={() => run('acknowledge')}
            disabled={busy}
            className="btn-outline px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            <Hand className="w-3.5 h-3.5" />
            Pick up for review
          </button>
        ) : (
          <span className="text-xs text-ink-500">
            Picked up by <span className="font-semibold">{pickedUpByMe ? 'you' : wo.qc_acknowledged_by_name}</span>
            {' · '}
            {formatIstDateTime(wo.qc_acknowledged_at)}
          </span>
        )}
      </div>

      {pickedUpByOther && (
        <p className="mt-3 text-xs text-warning-700">
          {wo.qc_acknowledged_by_name} is already reviewing this. Approve or send it back only if you have
          agreed that with them.
        </p>
      )}

      <label className="label-base mt-4" htmlFor="qc-notes">
        QC remarks <span className="font-normal text-ink-400">(required when sending back)</span>
      </label>
      <textarea
        id="qc-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="What you checked, or what maintenance must fix"
        className="input-base"
      />

      {confirming ? (
        <div
          className={cn(
            'mt-4 rounded-xl p-4 border',
            confirming === 'approve' ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200',
          )}
        >
          <p className="text-sm font-semibold text-ink-600">
            {confirming === 'approve'
              ? 'Close this work order? The machine goes back into service and the next PM is scheduled.'
              : 'Send this work order back to the maintenance supervisor?'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => run(confirming)}
              disabled={busy}
              className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5"
            >
              {busy && <Spinner size={14} />}
              {confirming === 'approve' ? 'Yes, approve and close' : 'Yes, send back'}
            </button>
            <button onClick={() => setConfirming(null)} disabled={busy} className="btn-ghost px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setConfirming('approve')}
            disabled={busy}
            className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve and close
          </button>
          <button
            onClick={() => {
              if (!notes.trim()) {
                toast.error('Write the reason for sending it back.')
                return
              }
              setConfirming('disapprove')
            }}
            disabled={busy}
            className="btn-outline px-4 py-2 text-sm inline-flex items-center gap-1.5 hover:!border-danger-600 hover:!text-danger-700"
          >
            <Undo2 className="w-4 h-4" />
            Send back to maintenance
          </button>
        </div>
      )}
    </div>
  )
}

/** The last QC decision. On a re-submitted order this is why QC sent it back. */
function PreviousQcDecision({ wo }: { wo: WorkOrderDetail }) {
  const blob = wo.qc_checklist
  if (!blob || typeof blob !== 'object') return null

  const decision = typeof blob.decision === 'string' ? blob.decision : null
  const by = typeof blob.decided_by_name === 'string' ? blob.decided_by_name : null
  const notes = typeof blob.notes === 'string' ? blob.notes : null
  // The maintenance app may store a richer sign-off blob; show whatever else it holds.
  const known = new Set(['decision', 'decided_by', 'decided_by_name', 'notes', 'source'])
  const extra = Object.entries(blob).filter(([k, v]) => !known.has(k) && v !== null && v !== '')

  return (
    <Section title={wo.status === 'CLOSED' ? 'QC sign-off' : 'Last QC decision'}>
      <div className="flex items-center gap-3 flex-wrap text-sm">
        {decision && <ResultBadge result={decision === 'APPROVED' ? 'PASS' : 'FAIL'} label={decision} />}
        {by && <span className="text-ink-500">by {by}</span>}
        {blob.source === 'qc_web' && <span className="text-[11px] text-ink-400">(QC system)</span>}
      </div>
      {notes && <p className="mt-2 text-sm text-ink-600 whitespace-pre-wrap">{notes}</p>}
      {extra.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {extra.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-ink-400">{k.replace(/_/g, ' ')}</dt>
              <dd className="text-sm text-ink-600 break-words">
                <BlobValue value={v} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  )
}

function BlobValue({ value }: { value: unknown }) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">
        Open link
      </a>
    )
  }
  if (typeof value === 'object') return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
  return <>{String(value)}</>
}

function Checklist({ wo }: { wo: WorkOrderDetail }) {
  const failed = wo.task_logs.filter((t) => t.status === 'FAIL').length
  return (
    <Section
      title="Checklist"
      aside={
        wo.task_logs.length > 0 ? (
          <span className={cn('text-xs font-semibold', failed ? 'text-danger-700' : 'text-ink-400')}>
            {failed ? `${failed} of ${wo.task_logs.length} not good` : `${wo.task_logs.length} checks`}
          </span>
        ) : null
      }
    >
      {wo.task_logs.length === 0 ? (
        <p className="text-sm text-ink-400 italic">This work order has no checklist steps.</p>
      ) : (
        <div className="table-wrap -mx-5">
          <table className="min-w-full divide-y divide-cream-300">
            <thead className="bg-cream-100">
              <tr>
                {['#', 'Check', 'Result', 'Technician remark'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {wo.task_logs.map((t, i) => (
                <tr key={t.id || i} className={t.status === 'FAIL' ? 'bg-danger-50/40' : ''}>
                  <td className="px-4 py-2.5 text-xs text-ink-400 tabular-nums align-top">{i + 1}</td>
                  <td className="px-4 py-2.5 align-top">
                    <div className="text-[13px] font-semibold text-ink-600">{t.title || '—'}</div>
                    {t.description && <div className="text-[11px] text-ink-400">{t.description}</div>}
                  </td>
                  <td className="px-4 py-2.5 align-top whitespace-nowrap">
                    <ResultBadge
                      result={t.status}
                      label={t.status === 'PASS' ? 'Good' : t.status === 'FAIL' ? 'Not good' : 'Pending'}
                    />
                  </td>
                  <td className="px-4 py-2.5 align-top text-[13px] text-ink-600 whitespace-pre-wrap">
                    {t.notes || <span className="text-ink-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

function Notes({ wo }: { wo: WorkOrderDetail }) {
  if (!wo.final_notes && !wo.supervisor_rejection_notes) return null
  return (
    <Section title="Notes">
      {wo.final_notes && (
        <div>
          <div className="text-[11px] text-ink-400">Technician</div>
          <p className="text-sm text-ink-600 whitespace-pre-wrap">{wo.final_notes}</p>
        </div>
      )}
      {wo.supervisor_rejection_notes && (
        <div className={wo.final_notes ? 'mt-3' : ''}>
          <div className="text-[11px] text-ink-400">
            Supervisor sent it back · {formatIstDateTime(wo.supervisor_rejected_at)}
          </div>
          <p className="text-sm text-ink-600 whitespace-pre-wrap">{wo.supervisor_rejection_notes}</p>
        </div>
      )}
    </Section>
  )
}

function Spares({ wo }: { wo: WorkOrderDetail }) {
  if (wo.spares.length === 0) return null
  return (
    <Section title="Spare parts used">
      <ul className="divide-y divide-cream-300">
        {wo.spares.map((s, i) => (
          <li key={s.id || i} className="py-2 flex items-start justify-between gap-4">
            <div>
              <div className="text-[13px] font-semibold text-ink-600">{s.spare_name || '—'}</div>
              {s.notes && <div className="text-[11px] text-ink-400">{s.notes}</div>}
            </div>
            <div className="text-sm text-ink-600 tabular-nums whitespace-nowrap">
              {s.quantity_used} {s.unit || ''}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Timeline({ wo }: { wo: WorkOrderDetail }) {
  const steps: { label: string; at: number | null; who?: string | null }[] = [
    { label: 'Generated', at: wo.generated_at },
    { label: 'Scheduled for', at: wo.scheduled_date },
    { label: 'Technician acknowledged', at: wo.acknowledged_at, who: wo.assigned_technician_name },
    { label: 'Work started', at: wo.started_at },
    { label: 'Submitted', at: wo.submitted_at },
    { label: 'Supervisor approved', at: wo.supervisor_approved_at, who: wo.supervisor_approved_by_name },
    { label: 'QC picked up', at: wo.qc_acknowledged_at, who: wo.qc_acknowledged_by_name },
    { label: 'Closed', at: wo.closed_at },
  ]
  return (
    <Section title="Timeline (IST)" className="mb-8">
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-baseline gap-3 text-sm">
            <span
              className={cn(
                'w-2 h-2 rounded-full shrink-0 translate-y-[-1px]',
                s.at ? 'bg-brand-500' : 'bg-cream-300',
              )}
            />
            <span className={cn('w-48 shrink-0', s.at ? 'text-ink-600 font-medium' : 'text-ink-300')}>{s.label}</span>
            <span className={cn('tabular-nums', s.at ? 'text-ink-500' : 'text-ink-300')}>
              {formatIstDateTime(s.at)}
              {s.at && s.who ? ` · ${s.who}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  )
}

/* ------------------------------------------------------------------------- */

function Section({
  title,
  aside,
  className,
  children,
}: {
  title: string
  aside?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('surface-card p-5 mb-4 animate-fade-in-up', className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h2>
        {aside}
      </div>
      {children}
    </div>
  )
}

function ResultBadge({ result, label }: { result: string; label: string }) {
  const r = (result || '').toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5',
        r === 'PASS' ? 'bg-success-50 text-success-700' : r === 'FAIL' ? 'bg-danger-50 text-danger-700' : 'bg-cream-200 text-ink-500',
      )}
    >
      {label}
    </span>
  )
}

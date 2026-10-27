'use client'

/**
 * Breakdown row cards for the Head views — FlagCard (HeadBreakdownsScreen.kt),
 * QcCard (HeadQcScreen.kt) and the history cards in presentation/head/reports.
 */

import { Badge, Card, StatusBadge, statusTone } from '@/components/maintenance/ui'
import { fmtDateTime, plantLabel } from '@/lib/maintenance/format'
import { flagMachineId, flagMachineName, flagRaisedAt, qcLabel, type HeadBreakdown } from '@/lib/maintenance/api/head'

const muted = 'text-xs text-zinc-500 dark:text-zinc-400'

function Title({ flag, right }: { flag: HeadBreakdown; right?: React.ReactNode }) {
  const id = flagMachineId(flag)
  const name = flagMachineName(flag)
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{name || '—'}</p>
        {id && id !== name && (
          <p className={muted}>
            {id}
            {flag.building ? ` · ${plantLabel(flag.building)}` : ''}
          </p>
        )}
      </div>
      {right}
    </div>
  )
}

/** Active / resolved breakdown (HeadBreakdownsScreen FlagCard) */
export function FlagCard({ flag }: { flag: HeadBreakdown }) {
  const qc = qcLabel(flag.qc_status)
  return (
    <Card className="p-4">
      <Title flag={flag} right={<StatusBadge status={flag.status} />} />
      <p className={`${muted} mt-1`}>
        Severity {flag.severity ?? 'MINOR'} · raised {fmtDateTime(flagRaisedAt(flag))}
      </p>
      {flag.description?.trim() && <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">{flag.description}</p>}
      <div className="mt-1.5 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-300">
        {flag.acknowledged_by_name && <p>Acknowledged by {flag.acknowledged_by_name}</p>}
        {flag.resolved_by_name && <p>Resolved by {flag.resolved_by_name}</p>}
        {qc && <p className="text-zinc-500 dark:text-zinc-400">QC: {qc}</p>}
      </div>
    </Card>
  )
}

/** Awaiting / decided QC (HeadQcScreen QcCard) */
export function QcCard({ flag, decided }: { flag: HeadBreakdown; decided: boolean }) {
  const qc = qcLabel(flag.qc_status)
  return (
    <Card className="p-4">
      <Title flag={flag} right={qc ? <Badge tone={qc === 'APPROVED' ? 'green' : qc === 'REJECTED' ? 'red' : 'amber'}>{qc}</Badge> : undefined} />
      {flag.description?.trim() && <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">{flag.description}</p>}
      <div className={`${muted} mt-1.5 space-y-0.5`}>
        {decided ? (
          <>
            {flag.qc_decided_by_name && <p>QC by {flag.qc_decided_by_name}</p>}
            {flag.qc_decision_notes?.trim() && <p>Note: {flag.qc_decision_notes}</p>}
          </>
        ) : (
          flag.resolved_by_name && <p>Resolved by {flag.resolved_by_name} — awaiting QC</p>
        )}
      </div>
    </Card>
  )
}

/** Breakdown — History row (BreakdownHistoryScreen BreakdownHistoryCard) */
export function BreakdownHistoryCard({ row }: { row: HeadBreakdown }) {
  return (
    <Card className="p-4">
      <Title flag={row} right={<StatusBadge status={row.status} />} />
      {row.description?.trim() && <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-200">{row.description}</p>}
      <p className={`${muted} mt-1`}>
        Severity: {row.severity ?? 'MINOR'} · reported {fmtDateTime(flagRaisedAt(row))}
      </p>
      {row.resolved_by_name?.trim() && <p className={muted}>Resolved by {row.resolved_by_name}</p>}
    </Card>
  )
}

/** QC Activity — History row (QcActivityHistoryScreen) */
export function QcHistoryCard({ row }: { row: HeadBreakdown }) {
  const qc = qcLabel(row.qc_status) ?? row.qc_status ?? '—'
  return (
    <Card className="p-4">
      <Title flag={row} right={<Badge tone={statusTone(qc === 'REJECTED' ? 'REJECTED' : qc)}>Decided: {qc}</Badge>} />
      <p className={`${muted} mt-1`}>
        Decided by {row.qc_decided_by_name ?? '—'}
        {row.qc_decided_at ? ` · ${fmtDateTime(row.qc_decided_at)}` : ''}
      </p>
      {row.qc_decision_notes?.trim() && <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{row.qc_decision_notes}</p>}
    </Card>
  )
}

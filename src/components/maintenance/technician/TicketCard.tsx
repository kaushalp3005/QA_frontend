'use client'

import clsx from 'clsx'
import { Camera } from 'lucide-react'
import { Card } from '@/components/maintenance/ui'
import { fmtRelative } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import {
  criticalityOf,
  isKickedBack,
  type Breakdown,
  type BreakdownSeverity,
  type Criticality,
} from '@/lib/maintenance/api/technicianBreakdowns'

/** Display row for one ticket (TicketRowUiModel) */
export interface TicketRow {
  flag: Breakdown
  machineCode: string
  machineName: string
  criticality: Criticality
}

export function toTicketRow(flag: Breakdown, assetNames: Map<string, string>): TicketRow {
  // Register name first, then the name the server sent, then the raw id — never drop the row.
  return {
    flag,
    machineCode: flag.machineId,
    machineName: assetNames.get(flag.machineId) ?? flag.assetName ?? flag.machineId,
    criticality: criticalityOf(flag.severity),
  }
}

const SEV_CLS: Record<BreakdownSeverity, string> = {
  CRITICAL: 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300',
  MAJOR: 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
  MINOR:
    'border-factory-300 bg-factory-50 text-factory-700 dark:border-factory-500/40 dark:bg-factory-500/10 dark:text-factory-300',
}
const CRIT_SEV: Record<Criticality, BreakdownSeverity> = { A: 'CRITICAL', B: 'MAJOR', C: 'MINOR' }

export function SeverityChip({ severity }: { severity: BreakdownSeverity }) {
  return (
    <span className={clsx('rounded border px-2 py-0.5 text-[11px] font-black tracking-wide', SEV_CLS[severity])}>
      {severity}
    </span>
  )
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  return (
    <span
      className={clsx(
        'inline-flex h-6 w-6 items-center justify-center rounded border text-[11px] font-black',
        SEV_CLS[CRIT_SEV[criticality]],
      )}
    >
      {criticality}
    </span>
  )
}

/** Status line under each ticket (TicketCard.StatusLine) */
function statusLine(f: Breakdown, now: number): { label: string; cls: string } {
  const rel = (v: number | null) => (v ? fmtRelative(v, now) : '')
  switch (f.status) {
    case 'OPEN':
      return { label: `Flagged ${fmtRelative(f.raisedAt, now)}`, cls: 'text-red-600 dark:text-red-400' }
    case 'ACKNOWLEDGED':
      return {
        label: `Acknowledged by ${f.acknowledgedByName ?? 'technician'} ${rel(f.acknowledgedAt)}`,
        cls: 'text-amber-800 dark:text-amber-300',
      }
    case 'PENDING_QC':
      return {
        label: `Sent to QC by ${f.resolvedByName ?? 'technician'} ${rel(f.resolvedAt)}`,
        cls: 'text-emerald-700 dark:text-emerald-400',
      }
    case 'CLOSED':
      return {
        label: `Approved by ${f.qcDecidedByName ?? 'QC'} ${rel(f.qcDecidedAt)}`,
        cls: 'text-emerald-700 dark:text-emerald-400',
      }
    case 'REOPENED':
      return {
        label: `Disapproved by ${f.qcDecidedByName ?? 'QC'} ${rel(f.qcDecidedAt)}`,
        cls: 'text-red-600 dark:text-red-400',
      }
  }
}

export function TicketCard({ row, now = Date.now() }: { row: TicketRow; now?: number }) {
  const { flag } = row
  const line = statusLine(flag, now)
  return (
    <Card href={MT.breakdown(flag.id)} className="p-4">
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{row.machineName}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{row.machineCode}</p>
          </div>
          <CriticalityBadge criticality={row.criticality} />
          <SeverityChip severity={flag.severity} />
        </div>

        <p className="line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">{flag.description}</p>

        {isKickedBack(flag) && (
          <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-800 dark:bg-red-500/15 dark:text-red-300">
            QC kicked back
          </span>
        )}

        <div className="flex items-center gap-2">
          <p className={clsx('flex-1 text-xs font-extrabold', line.cls)}>{line.label.trim()}</p>
          {(flag.beforePhotoUrl || flag.afterPhotoUrl) && (
            <Camera className="h-4 w-4 text-zinc-400" aria-label="Has photo" />
          )}
        </div>
      </div>
    </Card>
  )
}

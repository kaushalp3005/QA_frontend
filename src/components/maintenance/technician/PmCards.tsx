'use client'

import clsx from 'clsx'
import { Card } from '@/components/maintenance/ui'
import { fmtDayMonth } from '@/lib/maintenance/format'
import type { MtMachine } from '@/lib/maintenance/api/assets'
import {
  daysOverdue,
  daysToDue,
  escalationTier,
  isStartable,
  latestWorkOrderByPlan,
  planActionHint,
  planIntervalLabel,
  PM_GENERATION_LEAD_DAYS,
  woDoneAt,
  type PmPlan,
  type PmWoStatus,
  type PmWorkOrder,
} from '@/lib/maintenance/api/technicianPm'

// ── Row models (PmTaskRowUiModel / PmPlanRowUiModel) ─────────────────────

export interface PmTaskRow {
  wo: PmWorkOrder
  machineName: string
  machineCode: string
  machineLocation: string
  /** Negative = overdue, 0 = today */
  daysToDue: number
  /** 0..4, only meaningful while the work is still the technician's */
  tier: number
  doneAt: number
}

export function toTaskRow(wo: PmWorkOrder, assets: Map<string, MtMachine>, now = Date.now()): PmTaskRow {
  // machine_id is an asset_id: register first, then the WO's snapshot name.
  const a = assets.get(wo.machine_id)
  return {
    wo,
    machineName: a?.asset_name ?? (wo.machine_name || wo.template_name || wo.machine_id),
    machineCode: a?.asset_id ?? wo.machine_id,
    machineLocation: a?.sub_location ?? '',
    daysToDue: daysToDue(wo.scheduled_date, now),
    tier: escalationTier(wo.scheduled_date, now),
    doneAt: woDoneAt(wo),
  }
}

export interface PmPlanRow {
  plan: PmPlan
  machineName: string
  machineCode: string
  daysToDue: number
  /** The plan's most recent work order, any status */
  woId: string | null
  woStatus: PmWoStatus | null
  /** When the server turns this plan into a work order */
  generatesAt: number
}

export function toPlanRows(plans: PmPlan[], wos: PmWorkOrder[], assets: Map<string, MtMachine>, now = Date.now()) {
  const latest = latestWorkOrderByPlan(wos)
  return plans
    .map((p): PmPlanRow => {
      const a = assets.get(p.machine_id)
      const wo = latest.get(p.id)
      return {
        plan: p,
        machineName: a?.asset_name ?? (p.machine_name?.trim() || p.machine_id),
        machineCode: a?.asset_id ?? p.machine_id,
        daysToDue: daysToDue(p.next_due_at, now),
        woId: wo?.id ?? null,
        woStatus: wo?.status ?? null,
        generatesAt: p.next_due_at - PM_GENERATION_LEAD_DAYS * 86_400_000,
      }
    })
    .sort((a, b) => a.plan.next_due_at - b.plan.next_due_at)
}

// ── Chips ────────────────────────────────────────────────────────────────

const PILL = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide'
const AMBER = 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
const RED = 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
const GREEN = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
const BLUE = 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
const GRAY = 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'

export function PmStatusChip({ status }: { status: PmWoStatus }) {
  const [label, cls] =
    status === 'NOTIFIED'
      ? ['Notified', AMBER]
      : status === 'ACKNOWLEDGED'
        ? ['Ack', AMBER]
        : status === 'IN_PROGRESS'
          ? ['In progress', BLUE]
          : [status.replace(/_/g, ' '), GRAY]
  return <span className={clsx(PILL, cls)}>{label}</span>
}

function DueChip({ days }: { days: number }) {
  const [label, cls] =
    days < 0
      ? [`Overdue ${-days}d`, RED]
      : days === 0
        ? ['Due today', AMBER]
        : days === 1
          ? ['Due tomorrow', AMBER]
          : days <= 3
            ? [`Due in ${days}d`, AMBER]
            : [`Due in ${days}d`, GREEN]
  return <span className={clsx(PILL, cls)}>{label}</span>
}

function TierChip({ tier, overdue }: { tier: number; overdue: number }) {
  if (tier === 0) return null
  const cls =
    tier <= 2
      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
      : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
  return (
    <span className={clsx('rounded border px-2 py-0.5 text-[11px] font-black', cls, tier === 2 && 'animate-pulse')}>
      {tier >= 4 ? `CRITICAL ${overdue}d` : `Overdue ${overdue}d`}
    </span>
  )
}

export function HistoryStatusChip({ status }: { status: PmWoStatus }) {
  const [label, cls] =
    status === 'SUBMITTED'
      ? ['In review', AMBER]
      : status === 'SUPERVISOR_APPROVED' || status === 'PENDING_QC'
        ? ['With QC', BLUE]
        : status === 'QC_APPROVED'
          ? ['Approved', GREEN]
          : status === 'CLOSED'
            ? ['Closed', GREEN]
            : [status.replace(/_/g, ' '), GRAY]
  return <span className={clsx(PILL, cls)}>{label}</span>
}

// ── Cards ────────────────────────────────────────────────────────────────

/** A work order still on the technician's plate (PmTaskCard). */
export function PmTaskCard({ row, href }: { row: PmTaskRow; href: string }) {
  const { wo } = row
  return (
    <Card
      href={href}
      // Tier 4 = critically overdue: red wash on the card.
      className={clsx('p-4', row.tier === 4 && 'bg-red-50/70 dark:bg-red-500/10')}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{row.machineName}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {row.machineCode}
              {row.machineLocation ? ` · ${row.machineLocation}` : ''}
            </p>
          </div>
          <PmStatusChip status={wo.status} />
        </div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{wo.template_name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <DueChip days={row.daysToDue} />
          <TierChip tier={row.tier} overdue={daysOverdue(wo.scheduled_date)} />
          {wo.estimated_duration_minutes > 0 && (
            <span className="text-xs text-zinc-500">~{wo.estimated_duration_minutes} min</span>
          )}
        </div>
      </div>
    </Card>
  )
}

/** One assigned plan — the recurring schedule, not a work order (PmPlanCard). */
export function PmPlanCard({ row, onClick, showActionHint }: { row: PmPlanRow; onClick: () => void; showActionHint?: boolean }) {
  const d = row.daysToDue
  const startable = isStartable(row.woStatus)
  return (
    <Card onClick={onClick} className="p-4">
      <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{row.machineName}</p>
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{row.machineCode}</p>
      <p className="mt-1.5 text-xs">
        <span className={clsx('font-bold', d < 0 ? 'text-red-600 dark:text-red-400' : 'text-factory-700 dark:text-factory-300')}>
          {d < 0 ? `Overdue ${-d}d` : d === 0 ? 'Due today' : `Due in ${d}d`}
        </span>
        <span className="text-zinc-500"> · {planIntervalLabel(row.plan)}</span>
      </p>
      {showActionHint && (
        <p
          className={clsx(
            'mt-1 text-xs',
            startable ? 'font-bold text-factory-700 dark:text-factory-300' : 'text-zinc-500 dark:text-zinc-400',
          )}
        >
          {planActionHint(row.woStatus)}
        </p>
      )}
    </Card>
  )
}

/** A finished PM — no due/escalation chips, just when and where it stands. */
export function PmHistoryCard({ row, href }: { row: PmTaskRow; href: string }) {
  return (
    <Card href={href} className="p-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{row.machineName}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{row.machineCode}</p>
        </div>
        <HistoryStatusChip status={row.wo.status} />
      </div>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        Done {fmtDayMonth(row.doneAt)}
        {row.wo.overall_result ? ` · ${row.wo.overall_result}` : ''}
      </p>
    </Card>
  )
}

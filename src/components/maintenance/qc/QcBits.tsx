'use client'

/**
 * Small pieces shared by the QC screens — the TYPE chip, criticality letter,
 * severity chip, status callouts and the inbox card (QcHomeScreen.QcInboxCard).
 */

import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Camera, ChevronRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/maintenance/ui'
import { fmtRelative } from '@/lib/maintenance/format'
import type { Criticality, QcInboxRow } from '@/lib/maintenance/api/qcInbox'
import { flagDecision } from '@/lib/maintenance/api/qcInbox'
import { readSignOff } from '@/lib/maintenance/api/qc'
import type { MtRole } from '@/lib/maintenance/client'

export const qcRoleLabel = (role: MtRole) =>
  role === 'QC_HEAD' ? 'QC Head' : role === 'QC_MEMBER' ? 'QC Member' : role.replace(/_/g, ' ')

const RED = 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
const AMBER = 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300'
const TEAL =
  'border-factory-300 bg-factory-50 text-factory-700 dark:border-factory-500/40 dark:bg-factory-500/10 dark:text-factory-300'

export function TypeChip({ kind }: { kind: 'BD' | 'PM' }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[11px] font-black tracking-wide',
        kind === 'BD' ? RED : TEAL,
      )}
    >
      {kind}
    </span>
  )
}

export function CriticalityBadge({ value }: { value: Criticality }) {
  return (
    <span
      title={`Criticality ${value}`}
      className={clsx(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-black',
        value === 'A' ? RED : value === 'B' ? AMBER : TEAL,
      )}
    >
      {value}
    </span>
  )
}

export function SeverityChip({ severity }: { severity: string }) {
  const s = severity.toUpperCase()
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[11px] font-black',
        s === 'CRITICAL' ? RED : s === 'MAJOR' ? AMBER : TEAL,
      )}
    >
      {s}
    </span>
  )
}

/** Amber "warning" action (Acknowledge for QC / checklist Disapprove). Important
 *  modifiers so it beats the Button variant's own background. */
export const AMBER_BTN = '!bg-amber-500 hover:!bg-amber-600 !text-zinc-950'

type CalloutTone = 'amber' | 'green' | 'red'

/** Tinted status block (the Android Card(containerColor = …) callouts). */
export function Callout({ tone, title, children }: { tone: CalloutTone; title: ReactNode; children?: ReactNode }) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-4',
        tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
        tone === 'green' &&
          'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
        tone === 'red' && 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
      )}
    >
      <p className={clsx('font-semibold', tone !== 'amber' && 'text-base font-bold')}>{title}</p>
      {children && <div className="mt-1 space-y-1 text-sm opacity-90">{children}</div>}
    </div>
  )
}

export function PhotoBlock({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-48 w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-800"
      />
    </a>
  )
}

// ── Inbox card ───────────────────────────────────────────────────────────

export type QcTab = 'awaiting' | 'active' | 'done' | 'history'

type LineTone = 'amber' | 'teal' | 'green' | 'red' | 'muted'
const LINE: Record<LineTone, string> = {
  amber: 'text-amber-700 dark:text-amber-400',
  teal: 'text-factory-700 dark:text-factory-300',
  green: 'text-emerald-700 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  muted: 'text-zinc-600 dark:text-zinc-300',
}

const rel = (v: number | null | undefined, now: number) => (v ? fmtRelative(v, now) : '')

function statusLine(row: QcInboxRow, tab: QcTab, now: number): [string, LineTone] {
  if (row.kind === 'BD') {
    const f = row.flag
    if (tab === 'awaiting') return [`Sent to QC by ${f.resolved_by_name || 'technician'} ${rel(f.resolved_at, now)}`, 'amber']
    if (tab === 'active') return [`Picked up ${rel(row.claim?.at, now)}`, 'teal']
    const d = flagDecision(f)
    const [verb, tone]: [string, LineTone] =
      d === 'APPROVED' ? ['Approved', 'green'] : d === 'REJECTED' ? ['Rejected', 'red'] : ['Decided', 'muted']
    const who = f.qc_decided_by_name?.trim()
    return [`${verb}${who ? ` by ${who}` : ''} ${rel(f.qc_decided_at, now)}`, tone]
  }
  const w = row.wo
  if (tab === 'awaiting')
    return [
      `Sent to QC by ${w.supervisor_approved_by_name || 'supervisor'} ${rel(w.submitted_at ?? w.supervisor_approved_at, now)}`,
      'amber',
    ]
  if (tab === 'active') return [`Picked up ${rel(w.qc_acknowledged_at, now)}`, 'teal']
  const [verb, tone]: [string, LineTone] =
    w.status === 'QC_APPROVED' || w.status === 'CLOSED'
      ? ['Approved', 'green']
      : w.status === 'SUBMITTED'
        ? ['Sent back to supervisor', 'red']
        : ['Decided', 'muted']
  // Network work orders carry no qc_decided_*; the closer is the QC who picked it up.
  const who = w.qc_acknowledged_by_name?.trim()
  return [`${verb}${who ? ` by ${who}` : ''} ${rel(w.closed_at ?? w.qc_acknowledged_at, now)}`, tone]
}

export function QcInboxCard({ row, tab, href, now }: { row: QcInboxRow; tab: QcTab; href: string; now: number }) {
  const [line, tone] = statusLine(row, tab, now)
  const sub = [row.machineCode, row.machineLocation].filter(Boolean).join(' · ')
  return (
    <Card href={href} className="p-4">
      <div className="flex items-start gap-2.5">
        <TypeChip kind={row.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">{row.machineName}</p>
          {sub && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
        </div>
        <CriticalityBadge value={row.criticality} />
        {row.kind === 'BD' && <SeverityChip severity={row.flag.severity} />}
      </div>
      {row.kind === 'BD' ? (
        row.flag.description && (
          <p className="mt-2 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-200">{row.flag.description}</p>
        )
      ) : (
        <p className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {row.wo.template_name || row.wo.machine_name}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <p className={clsx('text-xs font-extrabold', LINE[tone])}>{line.trim()}</p>
        <span className="flex-1" />
        {row.kind === 'PM' && readPhoto(row) && <Camera className="h-4 w-4 text-zinc-400" aria-label="Photo" />}
      </div>
    </Card>
  )
}

const readPhoto = (row: QcInboxRow) => row.kind === 'PM' && !!readSignOff(row.wo.qc_checklist)?.after_photo_url

/** Chooser card used by the QC home and the Checklist Records hub. */
export function LandingCard({
  icon: Icon,
  title,
  subtitle,
  href,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  href: string
}) {
  return (
    <Card href={href} className="group flex items-center gap-4 p-5">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-factory-50 text-factory-700 dark:bg-factory-500/15 dark:text-factory-300">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
        <span className="block text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-factory-600" />
    </Card>
  )
}

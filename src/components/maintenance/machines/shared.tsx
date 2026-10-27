'use client'

/**
 * Small pieces shared by the machine list, machine master, detail and schedule
 * screens. Ported from MachineListScreen (status dot, warehouse switch),
 * machinemaster/MachineTypeChip.kt (SubCategoryChip) and the IdChip.
 */

import clsx from 'clsx'
import type { ReactNode } from 'react'
import { inputCls } from '@/components/maintenance/ui'
import type { MachineLiveStatus } from '@/lib/maintenance/api/machines'
import { LIVE_STATUS_META } from '@/lib/maintenance/api/machines'

export const LIVE_STATUS_TEXT: Record<MachineLiveStatus, string> = {
  RUNNING: 'text-emerald-600 dark:text-emerald-400',
  BREAKDOWN: 'text-red-600 dark:text-red-400',
  UNDER_QC: 'text-orange-600 dark:text-orange-400',
  IDLE: 'text-zinc-500 dark:text-zinc-400',
}

/** "● RUNNING" — the coloured status label on machine rows. */
export function LiveStatusDot({ status }: { status: MachineLiveStatus }) {
  return (
    <span className={clsx('whitespace-nowrap text-[11px] font-bold uppercase tracking-wide', LIVE_STATUS_TEXT[status])}>
      ● {LIVE_STATUS_META[status].label}
    </span>
  )
}

export function ShutDownDot() {
  return (
    <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
      ● Shut down
    </span>
  )
}

const CHIP_PALETTE = [
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-factory-100 text-factory-800 dark:bg-factory-500/15 dark:text-factory-300',
  'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
]

// Java String.hashCode so a category keeps the colour it has on Android.
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

/** Free-text category chip; the same category always gets the same colour. */
export function SubCategoryChip({ category, className }: { category: string; className?: string }) {
  const blank = !category?.trim()
  const tone = blank
    ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
    : CHIP_PALETTE[Math.abs(hashCode(category.toLowerCase())) % CHIP_PALETTE.length]
  return (
    <span className={clsx('inline-flex max-w-full items-center truncate rounded-full px-3 py-1 text-xs font-bold', tone, className)}>
      {blank ? '—' : category}
    </span>
  )
}

export function IdChip({ id }: { id: string }) {
  return (
    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {id}
    </span>
  )
}

/** Warehouse segmented switch: Both + each building. Shown only when 2+ exist. */
export function BuildingSwitch({
  buildings,
  value,
  onChange,
}: {
  buildings: string[]
  value: string | null
  onChange: (b: string | null) => void
}) {
  if (buildings.length < 2) return null
  const options: Array<string | null> = [null, ...buildings]
  return (
    <div className="inline-flex w-full overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 sm:w-auto">
      {options.map((b, i) => (
        <button
          key={b ?? '__both'}
          type="button"
          onClick={() => onChange(b)}
          className={clsx(
            'flex-1 px-4 py-2 text-sm font-semibold transition sm:flex-none',
            i > 0 && 'border-l border-zinc-300 dark:border-zinc-700',
            value === b
              ? 'bg-factory-600 text-white'
              : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
          )}
        >
          {b ?? 'Both'}
        </button>
      ))}
    </div>
  )
}

/** Read-only filter dropdown; the first entry clears the filter (null). */
export function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  allLabel: string
  value: string | null
  options: string[]
  onChange: (v: string | null) => void
  className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={inputCls}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

/** On/off switch (Material Switch). */
export function Toggle({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  children?: ReactNode
}) {
  return (
    <label className={clsx('inline-flex items-center gap-3', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
          checked ? 'bg-factory-600' : 'bg-zinc-300 dark:bg-zinc-700',
        )}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 rounded-full bg-white shadow transition',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
      {children && <span className="text-sm text-zinc-800 dark:text-zinc-100">{children}</span>}
    </label>
  )
}

/** Distinct, non-blank, sorted values. */
export const distinctSorted = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((v): v is string => !!v && !!v.trim()))).sort((a, b) => a.localeCompare(b))

export const eqIgnoreCase = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').toLowerCase() === (b ?? '').toLowerCase()

export const containsIgnoreCase = (hay: string | null | undefined, needle: string) =>
  (hay ?? '').toLowerCase().includes(needle.toLowerCase())

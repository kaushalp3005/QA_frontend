'use client'

/**
 * Shared filter row for the report/history screens — PlantFilterChips and the
 * From/To DateField pair from presentation/utilities/UtilityComponents.kt.
 */

import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card, Chips, Field, Input } from '@/components/maintenance/ui'
import { isoDateIst } from '@/lib/maintenance/format'

export const PLANTS = ['A185', 'W202'] as const

/** Every history screen opens on the last 30 days. */
export function defaultRange(): { from: string; to: string } {
  return { from: isoDateIst(Date.now() - 30 * 86_400_000), to: isoDateIst() }
}

/** All / A185 / W202 — null means All. */
export function PlantFilterChips({ value, onChange }: { value: string | null; onChange: (p: string | null) => void }) {
  return (
    <Chips
      options={[{ id: 'ALL', label: 'All' }, ...PLANTS.map((p) => ({ id: p, label: p }))]}
      value={value ?? 'ALL'}
      onChange={(id) => onChange(id === 'ALL' ? null : id)}
    />
  )
}

export function DateRangeFields({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      <Field label="From">
        <Input type="date" value={from} max={to || undefined} onChange={(e) => e.target.value && onChange(e.target.value, to)} />
      </Field>
      <Field label="To">
        <Input type="date" value={to} min={from || undefined} onChange={(e) => e.target.value && onChange(from, e.target.value)} />
      </Field>
    </div>
  )
}

/** Hub row: icon, title, optional subtitle, chevron (ReportTile / SectionCard). */
export function HubTile({
  href,
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  href: string
  icon: LucideIcon
  title: string
  subtitle?: string
  badge?: string
}) {
  return (
    <Card href={href} className="group flex items-center gap-4 p-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-factory-50 text-factory-700 dark:bg-factory-500/15 dark:text-factory-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
          {badge && <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{badge}</span>}
        </span>
        {subtitle && <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-factory-600" />
    </Card>
  )
}
